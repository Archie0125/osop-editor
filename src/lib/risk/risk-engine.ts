import { OsopWorkflow, OsopNode } from '../../types/osop';
import { topoSort, getOutgoingEdges, getIncomingEdges } from '../execution/graph-utils';
import {
  RiskFinding,
  RiskSeverity,
  NODE_TYPE_WEIGHT,
  RISK_LEVEL_SCORE,
  checkMissingApprovalGate,
  checkBroadPermissions,
  checkDestructiveCommands,
  checkHardcodedSecrets,
  checkCostExposure,
  checkSegregation,
  checkMissingErrorHandling,
  checkMissingTimeout,
} from './risk-rules';

// ============================================================
// Risk Analysis Engine — DAG walker + composite risk scoring
// ============================================================

export interface NodeRiskScore {
  node_id: string;
  node_name: string;
  node_type: string;
  base_score: number;
  mitigated_score: number;
  risk_level: string;
  findings: RiskFinding[];
}

export interface WorkflowRiskReport {
  workflow_id: string;
  workflow_name: string;
  overall_score: number;           // 0-100
  verdict: 'safe' | 'caution' | 'warning' | 'danger';
  node_scores: NodeRiskScore[];
  findings: RiskFinding[];
  summary: {
    total_nodes: number;
    high_risk_nodes: number;
    unguarded_paths: number;
    total_findings: number;
    by_severity: Record<RiskSeverity, number>;
    estimated_cost: number | null;
    has_approval_gates: boolean;
    permissions_required: string[];
    secrets_required: string[];
  };
}

function computeNodeBaseScore(node: OsopNode): number {
  const typeWeight = NODE_TYPE_WEIGHT[node.type] || 1.0;
  const riskLevel = node.security?.risk_level || 'low';
  const riskMultiplier = RISK_LEVEL_SCORE[riskLevel] || 1;
  return typeWeight * riskMultiplier;
}

function computeMitigationFactor(node: OsopNode, outEdges: ReturnType<typeof getOutgoingEdges>): number {
  let factor = 1.0;

  if (node.approval_gate?.required) factor -= 0.5;
  if (node.retry_policy) factor -= 0.1;

  const hasFallback = outEdges.some(e => e.mode === 'fallback' || e.mode === 'error' || e.mode === 'compensation');
  if (hasFallback) factor -= 0.2;

  if (node.idempotency?.enabled) factor -= 0.05;

  return Math.max(factor, 0.1); // At least 10% of base score remains
}

function hasApprovalPredecessor(
  nodeId: string,
  edges: OsopWorkflow['edges'],
  nodeMap: Map<string, OsopNode>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);

  const incoming = getIncomingEdges(nodeId, edges);
  for (const edge of incoming) {
    const pred = nodeMap.get(edge.from);
    if (!pred) continue;
    if (pred.type === 'human' && pred.approval_gate?.required) return true;
    if (pred.approval_gate?.required) return true;
    // Check one more level up
    if (hasApprovalPredecessor(edge.from, edges, nodeMap, visited)) return true;
  }
  return false;
}

export function analyzeWorkflowRisk(workflow: OsopWorkflow): WorkflowRiskReport {
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const executionOrder = topoSort(workflow.nodes, workflow.edges);
  const allFindings: RiskFinding[] = [];
  const nodeScores: NodeRiskScore[] = [];

  let totalWeightedScore = 0;
  let maxPossibleScore = 0;
  let highRiskNodes = 0;
  let unguardedPaths = 0;
  let totalEstimatedCost = 0;
  let hasAnyCost = false;
  const allPermissions = new Set<string>();
  const allSecrets = new Set<string>();
  let hasApprovalGates = false;

  // Collect workflow-level info
  for (const node of workflow.nodes) {
    node.security?.permissions?.forEach(p => allPermissions.add(p));
    node.security?.secrets?.forEach(s => allSecrets.add(s));
    if (node.approval_gate?.required) hasApprovalGates = true;
    if (node.cost?.estimated) {
      totalEstimatedCost += node.cost.estimated;
      hasAnyCost = true;
    }
  }

  // Run per-node analysis in execution order
  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const outEdges = getOutgoingEdges(nodeId, workflow.edges);
    const nodeFindings: RiskFinding[] = [];

    // Run all rule checks
    const approvalCheck = checkMissingApprovalGate(
      node,
      hasApprovalPredecessor(nodeId, workflow.edges, nodeMap)
    );
    if (approvalCheck) {
      nodeFindings.push(approvalCheck);
      unguardedPaths++;
    }

    const permCheck = checkBroadPermissions(node);
    if (permCheck) nodeFindings.push(permCheck);

    const cmdCheck = checkDestructiveCommands(node);
    if (cmdCheck) nodeFindings.push(cmdCheck);

    const secretFindings = checkHardcodedSecrets(node);
    nodeFindings.push(...secretFindings);

    const errorCheck = checkMissingErrorHandling(node, outEdges);
    if (errorCheck) nodeFindings.push(errorCheck);

    const timeoutCheck = checkMissingTimeout(node);
    if (timeoutCheck) nodeFindings.push(timeoutCheck);

    // Compute score
    const baseScore = computeNodeBaseScore(node);
    const mitigation = computeMitigationFactor(node, outEdges);
    const mitigatedScore = baseScore * mitigation;

    const riskLevel = node.security?.risk_level || 'low';
    if (riskLevel === 'high' || riskLevel === 'critical') highRiskNodes++;

    totalWeightedScore += mitigatedScore;
    maxPossibleScore += NODE_TYPE_WEIGHT[node.type] || 1.0;
    maxPossibleScore *= RISK_LEVEL_SCORE['critical']; // Theoretical max

    nodeScores.push({
      node_id: nodeId,
      node_name: node.name || nodeId,
      node_type: node.type,
      base_score: baseScore,
      mitigated_score: mitigatedScore,
      risk_level: riskLevel,
      findings: nodeFindings,
    });

    allFindings.push(...nodeFindings);
  }

  // Global checks
  const agentNodes = workflow.nodes.filter(n => n.type === 'agent');
  const costCheck = checkCostExposure(agentNodes);
  if (costCheck) allFindings.push(costCheck);

  const segregationFindings = checkSegregation(workflow.nodes);
  allFindings.push(...segregationFindings);

  // Compute overall score (0-100)
  // Normalize: use the sum of mitigated scores relative to node count
  const nodeCount = workflow.nodes.length;
  const avgMitigatedScore = nodeCount > 0 ? totalWeightedScore / nodeCount : 0;

  // Map to 0-100 scale: score of 8 (one critical node, max weight) = 100
  const normalizedScore = Math.min(100, Math.round((avgMitigatedScore / 8) * 100));

  // Add finding-based penalty
  const findingPenalty = allFindings.reduce((sum, f) => {
    const penalties: Record<RiskSeverity, number> = {
      info: 0, low: 2, medium: 5, high: 10, critical: 20,
    };
    return sum + (penalties[f.severity] || 0);
  }, 0);

  const overallScore = Math.min(100, normalizedScore + findingPenalty);

  // Verdict
  let verdict: WorkflowRiskReport['verdict'];
  if (overallScore <= 20) verdict = 'safe';
  else if (overallScore <= 45) verdict = 'caution';
  else if (overallScore <= 70) verdict = 'warning';
  else verdict = 'danger';

  // Severity breakdown
  const bySeverity: Record<RiskSeverity, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of allFindings) {
    bySeverity[f.severity]++;
  }

  return {
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    overall_score: overallScore,
    verdict,
    node_scores: nodeScores,
    findings: allFindings,
    summary: {
      total_nodes: nodeCount,
      high_risk_nodes: highRiskNodes,
      unguarded_paths: unguardedPaths,
      total_findings: allFindings.length,
      by_severity: bySeverity,
      estimated_cost: hasAnyCost ? totalEstimatedCost : null,
      has_approval_gates: hasApprovalGates,
      permissions_required: [...allPermissions],
      secrets_required: [...allSecrets],
    },
  };
}
