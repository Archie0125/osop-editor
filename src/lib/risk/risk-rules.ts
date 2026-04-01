import { OsopNode, OsopEdge } from '../../types/osop';

// ============================================================
// Risk Rules — Declarative rule definitions for risk detection
// ============================================================

export type RiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface RiskFinding {
  rule_id: string;
  severity: RiskSeverity;
  node_id?: string;
  title: string;
  description: string;
  suggestion: string;
}

// --- Destructive command patterns ---

const DESTRUCTIVE_COMMANDS = [
  /rm\s+-rf/i,
  /drop\s+(table|database|schema)/i,
  /delete\s+from/i,
  /truncate\s+table/i,
  /kubectl\s+delete/i,
  /terraform\s+destroy/i,
  /docker\s+system\s+prune/i,
  /git\s+push\s+--force/i,
  /git\s+reset\s+--hard/i,
  /format\s+[a-z]:/i,
  /fdisk/i,
  /mkfs/i,
];

const BROAD_PERMISSIONS = [
  /^write:\*/,
  /^delete:\*/,
  /^admin:\*/,
  /^\*:\*/,
  /^root$/,
  /^sudo$/,
];

const SECRET_PATTERNS = [
  /^sk-/,
  /^ghp_/,
  /^xoxb-/,
  /^AKIA/,
  /^eyJ/,       // JWT
  /password/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i,
];

// --- Risk weight by node type ---

export const NODE_TYPE_WEIGHT: Record<string, number> = {
  cli: 2.0,
  infra: 2.0,
  db: 1.5,
  agent: 1.5,
  docker: 1.5,
  api: 1.0,
  cicd: 1.5,
  git: 1.0,
  mcp: 1.0,
  human: 0.5,
  system: 0.5,
  company: 1.0,
  department: 0.5,
  event: 0.5,
  gateway: 0.2,
  data: 0.8,
};

export const RISK_LEVEL_SCORE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 8,
};

// --- Rule: High-risk node without approval gate ---

export function checkMissingApprovalGate(
  node: OsopNode,
  predecessorHasApproval: boolean
): RiskFinding | null {
  const riskLevel = node.security?.risk_level;
  if (!riskLevel || (riskLevel !== 'high' && riskLevel !== 'critical')) return null;
  if (node.approval_gate?.required) return null;
  if (predecessorHasApproval) return null;

  return {
    rule_id: 'RISK-001',
    severity: riskLevel === 'critical' ? 'critical' : 'high',
    node_id: node.id,
    title: `${riskLevel.toUpperCase()} risk node without approval gate`,
    description: `Node "${node.name || node.id}" has risk_level: ${riskLevel} but no approval gate before it.`,
    suggestion: `Add an approval_gate with required: true, or add a human node with approval before this step.`,
  };
}

// --- Rule: Broad permissions ---

export function checkBroadPermissions(node: OsopNode): RiskFinding | null {
  const perms = node.security?.permissions;
  if (!perms) return null;

  const broad = perms.filter(p => BROAD_PERMISSIONS.some(re => re.test(p)));
  if (broad.length === 0) return null;

  return {
    rule_id: 'RISK-002',
    severity: 'high',
    node_id: node.id,
    title: 'Overly broad permissions',
    description: `Node "${node.name || node.id}" requests broad permissions: ${broad.join(', ')}.`,
    suggestion: 'Narrow permissions to specific resources (e.g., write:deployments instead of write:*).',
  };
}

// --- Rule: Destructive CLI commands ---

export function checkDestructiveCommands(node: OsopNode): RiskFinding | null {
  if (node.type !== 'cli' && node.type !== 'infra') return null;

  const command = node.runtime?.command || node.runtime?.action || '';
  if (typeof command !== 'string') return null;

  const match = DESTRUCTIVE_COMMANDS.find(re => re.test(command));
  if (!match) return null;

  const declaredRisk = node.security?.risk_level;
  if (declaredRisk === 'high' || declaredRisk === 'critical') return null; // Already flagged correctly

  return {
    rule_id: 'RISK-003',
    severity: 'high',
    node_id: node.id,
    title: 'Destructive command without adequate risk level',
    description: `Node "${node.name || node.id}" contains a destructive command but risk_level is "${declaredRisk || 'not set'}".`,
    suggestion: `Set security.risk_level to "high" or "critical" and add an approval gate.`,
  };
}

// --- Rule: Hardcoded secrets ---

export function checkHardcodedSecrets(node: OsopNode): RiskFinding[] {
  const findings: RiskFinding[] = [];

  const checkValue = (val: unknown, path: string) => {
    if (typeof val !== 'string') return;
    if (val.startsWith('$') || val.startsWith('${')) return; // Env var reference — OK
    if (SECRET_PATTERNS.some(re => re.test(val)) && val.length > 8) {
      findings.push({
        rule_id: 'RISK-004',
        severity: 'critical',
        node_id: node.id,
        title: 'Possible hardcoded secret',
        description: `Node "${node.name || node.id}" may contain a hardcoded secret at ${path}.`,
        suggestion: 'Use environment variable references ($SECRET_NAME) instead of hardcoded values.',
      });
    }
  };

  // Check runtime config values
  if (node.runtime) {
    for (const [key, val] of Object.entries(node.runtime)) {
      checkValue(val, `runtime.${key}`);
    }
  }

  return findings;
}

// --- Rule: Agent cost exposure ---

export function checkCostExposure(
  agentNodes: OsopNode[],
  budgetThreshold: number = 10
): RiskFinding | null {
  let totalEstimated = 0;
  let unbounded = 0;

  for (const node of agentNodes) {
    if (node.cost?.estimated) {
      totalEstimated += node.cost.estimated;
    } else if (node.type === 'agent') {
      unbounded++;
    }
  }

  if (totalEstimated > budgetThreshold) {
    return {
      rule_id: 'RISK-005',
      severity: 'medium',
      title: 'High estimated cost',
      description: `Total estimated cost is $${totalEstimated.toFixed(2)}, exceeding threshold of $${budgetThreshold}.`,
      suggestion: 'Review agent node costs and add budget_ref for cost tracking.',
    };
  }

  if (unbounded > 2) {
    return {
      rule_id: 'RISK-005',
      severity: 'medium',
      title: 'Unbounded cost exposure',
      description: `${unbounded} agent nodes have no estimated cost set.`,
      suggestion: 'Add cost.estimated to agent nodes to enable cost tracking.',
    };
  }

  return null;
}

// --- Rule: Segregation of duties violation ---

export function checkSegregation(nodes: OsopNode[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const node of nodes) {
    const segregateFrom = node.actors?.segregation_from;
    if (!segregateFrom) continue;

    for (const otherId of segregateFrom) {
      const other = nodeMap.get(otherId);
      if (!other) continue;
      // If both nodes have the same role and no explicit actor pool, flag it
      if (node.role && other.role && node.role === other.role) {
        findings.push({
          rule_id: 'RISK-006',
          severity: 'high',
          node_id: node.id,
          title: 'Segregation of duties concern',
          description: `Node "${node.name || node.id}" and "${other.name || other.id}" share role "${node.role}" but require segregation.`,
          suggestion: 'Assign different roles or use explicit actor pools to enforce separation.',
        });
      }
    }
  }

  return findings;
}

// --- Rule: No error handling on critical path ---

export function checkMissingErrorHandling(
  node: OsopNode,
  outgoingEdges: OsopEdge[]
): RiskFinding | null {
  const riskLevel = node.security?.risk_level;
  if (!riskLevel || riskLevel === 'low') return null;

  const hasErrorEdge = outgoingEdges.some(e =>
    e.mode === 'fallback' || e.mode === 'error' || e.mode === 'compensation'
  );
  const hasRetry = !!node.retry_policy;

  if (!hasErrorEdge && !hasRetry) {
    return {
      rule_id: 'RISK-007',
      severity: 'medium',
      node_id: node.id,
      title: 'No error handling on risky node',
      description: `Node "${node.name || node.id}" (risk: ${riskLevel}) has no fallback, error edge, or retry policy.`,
      suggestion: 'Add a fallback edge, error edge, or retry_policy for resilience.',
    };
  }

  return null;
}

// --- Rule: Missing timeout on external calls ---

export function checkMissingTimeout(node: OsopNode): RiskFinding | null {
  const externalTypes = ['api', 'cli', 'agent', 'infra', 'mcp'];
  if (!externalTypes.includes(node.type)) return null;
  if (node.timeout_sec) return null;

  return {
    rule_id: 'RISK-008',
    severity: 'low',
    node_id: node.id,
    title: 'Missing timeout on external operation',
    description: `Node "${node.name || node.id}" (type: ${node.type}) has no timeout_sec set.`,
    suggestion: 'Set timeout_sec to prevent indefinite execution.',
  };
}
