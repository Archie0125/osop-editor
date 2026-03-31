import yaml from 'js-yaml';
import { OsopWorkflow, OsopNode, OsopEdge } from '../../types/osop';
import { WorkflowRunRecord, WorkflowStats } from './types';
import { topoSort, getOutgoingEdges } from './graph-utils';

interface SOPStep {
  step: number;
  node_id: string;
  action_type: string;
  instruction: string;
  inputs_required?: Array<{ name: string; schema?: string; required?: boolean }>;
  outputs_expected?: Array<{ name: string; schema?: string }>;
  success_criteria?: string[];
  on_success: string;
  on_failure: string;
  runtime?: Record<string, any>;
}

interface AgentSOP {
  osop_agent_sop: {
    version: string;
    workflow_id: string;
    workflow_name: string;
    goal: string;
    context: {
      description?: string;
      osop_version: string;
      total_nodes: number;
      total_edges: number;
    };
    steps: SOPStep[];
    execution_history?: {
      total_runs: number;
      success_rate: number;
      avg_duration_ms: number;
      known_issues: Array<{
        node_id: string;
        issue: string;
        suggestion: string;
      }>;
    };
  };
}

function getActionType(node: OsopNode): string {
  const map: Record<string, string> = {
    human: 'human_input',
    agent: 'llm_call',
    api: 'api_call',
    cli: 'cli_command',
    db: 'db_query',
    git: 'git_operation',
    docker: 'container_operation',
    cicd: 'cicd_action',
    infra: 'infra_provision',
    mcp: 'mcp_tool_call',
    system: 'system_action',
    company: 'external_org_handoff',
    department: 'internal_handoff',
    event: 'wait_for_event',
    gateway: 'evaluate_condition',
    data: 'data_transform',
  };
  return map[node.type] || 'system_action';
}

function buildInstruction(node: OsopNode): string {
  if (node.explain?.what) return node.explain.what;
  if (node.purpose) return node.purpose;
  return `Execute ${node.type} node: ${node.id}`;
}

function buildOnSuccess(nodeId: string, edges: OsopEdge[], executionOrder: string[]): string {
  const outEdges = getOutgoingEdges(nodeId, edges);
  if (outEdges.length === 0) return 'END — workflow complete';

  const seqEdges = outEdges.filter(e => !e.mode || e.mode === 'sequential');
  const condEdges = outEdges.filter(e => e.mode === 'conditional');
  const parallelEdges = outEdges.filter(e => e.mode === 'parallel');

  const parts: string[] = [];

  if (condEdges.length > 0) {
    for (const e of condEdges) {
      parts.push(`IF ${e.when || 'true'} → go to ${e.to}`);
    }
  }
  if (parallelEdges.length > 0) {
    parts.push(`PARALLEL: [${parallelEdges.map(e => e.to).join(', ')}]`);
  }
  if (seqEdges.length > 0 && parts.length === 0) {
    parts.push(`proceed to ${seqEdges[0].to}`);
  }

  return parts.join(' | ') || 'proceed to next step';
}

function buildOnFailure(node: OsopNode, edges: OsopEdge[]): string {
  const fallbacks = getOutgoingEdges(node.id, edges).filter(e => e.mode === 'fallback' || e.mode === 'error');
  const parts: string[] = [];

  if (node.retry_policy) {
    parts.push(`retry ${node.retry_policy.max_retries} times (${node.retry_policy.strategy}, ${node.retry_policy.backoff_sec}s backoff)`);
  }
  if (fallbacks.length > 0) {
    parts.push(`then fallback to ${fallbacks.map(e => e.to).join(' or ')}`);
  }
  if (parts.length === 0) {
    return 'HALT and report error';
  }
  return parts.join(', ');
}

export function generateAgentSOP(
  workflow: OsopWorkflow,
  stats?: WorkflowStats,
  runs?: WorkflowRunRecord[]
): string {
  const executionOrder = topoSort(workflow.nodes, workflow.edges);
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));

  const steps: SOPStep[] = executionOrder.map((nodeId, idx) => {
    const node = nodeMap.get(nodeId)!;
    return {
      step: idx + 1,
      node_id: node.id,
      action_type: getActionType(node),
      instruction: buildInstruction(node),
      inputs_required: node.inputs?.map(i => ({ name: i.name, schema: i.schema, required: i.required })),
      outputs_expected: node.outputs?.map(o => ({ name: o.name, schema: o.schema })),
      success_criteria: node.success_criteria,
      on_success: buildOnSuccess(node.id, workflow.edges, executionOrder),
      on_failure: buildOnFailure(node, workflow.edges),
      ...(node.runtime ? { runtime: node.runtime } : {}),
    };
  });

  const sop: AgentSOP = {
    osop_agent_sop: {
      version: '1.0',
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      goal: workflow.description || workflow.name,
      context: {
        description: workflow.description,
        osop_version: workflow.osop_version,
        total_nodes: workflow.nodes.length,
        total_edges: workflow.edges.length,
      },
      steps,
    },
  };

  // Add execution history if available
  if (stats && stats.total_runs > 0) {
    const knownIssues: AgentSOP['osop_agent_sop']['execution_history'] extends { known_issues: infer T } ? T : never = [];

    for (const [nodeId, ns] of Object.entries(stats.node_stats)) {
      if (ns.failure_rate > 0.1) {
        knownIssues.push({
          node_id: nodeId,
          issue: `Failure rate: ${(ns.failure_rate * 100).toFixed(0)}%${ns.common_errors.length > 0 ? ` (${ns.common_errors[0]})` : ''}`,
          suggestion: ns.failure_rate > 0.3 ? 'Consider adding retry policy or fallback' : 'Monitor closely',
        });
      }
      if (ns.avg_duration_ms > 10000) {
        knownIssues.push({
          node_id: nodeId,
          issue: `Slow execution: avg ${(ns.avg_duration_ms / 1000).toFixed(1)}s`,
          suggestion: 'Consider optimizing or adding timeout',
        });
      }
    }

    sop.osop_agent_sop.execution_history = {
      total_runs: stats.total_runs,
      success_rate: +stats.success_rate.toFixed(2),
      avg_duration_ms: stats.avg_duration_ms,
      known_issues: knownIssues,
    };
  }

  return yaml.dump(sop, { indent: 2, lineWidth: 120, noRefs: true, sortKeys: false });
}
