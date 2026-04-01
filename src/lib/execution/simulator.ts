import { OsopWorkflow, OsopNode, OsopEdge } from '../../types/osop';
import { WorkflowRunRecord, NodeRunRecord, RunMode, NodeRunStatus } from './types';
import { topoSort, getOutgoingEdges, evaluateCondition, simpleHash, uuid } from './graph-utils';
import { runStore } from './store';

export interface SimulationOptions {
  mode: RunMode;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, record: NodeRunRecord) => void;
  onProgress?: (record: WorkflowRunRecord) => void;
}

const NODE_TYPE_ACTION_MAP: Record<string, NodeRunRecord['action_ref']> = {
  human:      { type: 'human_input' },
  agent:      { type: 'mcp_tool', tool_name: 'llm.generate' },
  api:        { type: 'api_call' },
  cli:        { type: 'cli_command' },
  db:         { type: 'api_call', endpoint: 'database' },
  git:        { type: 'cli_command', command: 'git' },
  docker:     { type: 'cli_command', command: 'docker' },
  cicd:       { type: 'api_call', endpoint: 'ci-server' },
  infra:      { type: 'cli_command', command: 'terraform' },
  mcp:        { type: 'mcp_tool' },
  system:     { type: 'simulated' },
  company:    { type: 'api_call', endpoint: 'external-org' },
  department: { type: 'simulated' },
  event:      { type: 'simulated' },
  gateway:    { type: 'simulated' },
  data:       { type: 'simulated' },
};

function randomDelay(node: OsopNode): number {
  if (node.timeout_sec) return Math.random() * node.timeout_sec * 100; // 0-10% of timeout as ms
  const base: Record<string, number> = {
    human: 3000, agent: 2000, api: 500, cli: 800, db: 300,
    git: 400, docker: 1500, cicd: 2000, infra: 3000, mcp: 1000,
    system: 200, company: 5000, department: 1000, event: 100, gateway: 50, data: 400,
  };
  const b = base[node.type] || 500;
  return Math.round(b * (0.5 + Math.random()));
}

function shouldFail(node: OsopNode): boolean {
  // Higher failure rate for nodes with explicit failure_modes
  const rate = node.failure_modes?.length ? 0.15 : 0.05;
  return Math.random() < rate;
}

function mockOutputs(node: OsopNode): Record<string, any> {
  const outputs: Record<string, any> = {};
  if (node.outputs) {
    for (const out of node.outputs) {
      outputs[out.name] = `<mock:${out.schema || out.type || 'any'}>`;
    }
  }
  outputs._status = 'ok';
  return outputs;
}

function mockInputs(node: OsopNode): Record<string, any> {
  const inputs: Record<string, any> = {};
  if (node.inputs) {
    for (const inp of node.inputs) {
      inputs[inp.name] = `<input:${inp.schema || inp.type || 'any'}>`;
    }
  }
  return inputs;
}

export async function simulateWorkflow(
  workflow: OsopWorkflow,
  yamlText: string,
  options: SimulationOptions
): Promise<WorkflowRunRecord> {
  const runId = uuid();
  const now = new Date().toISOString();

  const record: WorkflowRunRecord = {
    run_id: runId,
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    workflow_version: workflow.metadata?.version || workflow.version || '0.0.0',
    snapshot_hash: simpleHash(yamlText),
    mode: options.mode,
    status: 'RUNNING',
    trigger: { type: 'manual', actor: 'user', timestamp: now },
    started_at: now,
    node_records: [],
    variables_snapshot: {},
  };

  // Save initial state
  runStore.saveRun(record);
  options.onProgress?.(record);

  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const executionOrder = topoSort(workflow.nodes, workflow.edges);
  const context: Record<string, any> = { inputs: {}, outputs: {} };
  const skippedNodes = new Set<string>();
  let hasFailure = false;

  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Check if this node should be reached via edges
    const inEdges = workflow.edges.filter(e => e.to === nodeId);
    if (inEdges.length > 0) {
      const anySourceCompleted = inEdges.some(e => {
        if (skippedNodes.has(e.from)) return false;
        if (e.mode === 'conditional' && e.when) {
          return evaluateCondition(e.when, context);
        }
        if (e.mode === 'fallback') {
          // Only take fallback if the source failed
          return hasFailure;
        }
        return true; // sequential, parallel, etc.
      });
      if (!anySourceCompleted && inEdges.length > 0) {
        skippedNodes.add(nodeId);
        const skipRecord: NodeRunRecord = {
          run_id: runId,
          node_id: nodeId,
          node_type: node.type,
          attempt: 1,
          status: 'SKIPPED',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_ms: 0,
          inputs_snapshot: {},
          action_ref: { type: 'simulated' },
        };
        record.node_records.push(skipRecord);
        continue;
      }
    }

    options.onNodeStart?.(nodeId);

    const startTime = Date.now();
    const nodeStartAt = new Date().toISOString();

    // Simulate delay
    if (options.mode === 'simulated') {
      const delay = randomDelay(node);
      await new Promise(r => setTimeout(r, Math.min(delay, 3000))); // Cap at 3s for UX
    }

    const failed = options.mode === 'simulated' && shouldFail(node);
    const endTime = Date.now();

    let status: NodeRunStatus = failed ? 'FAILED' : 'COMPLETED';
    if (node.optional && failed) status = 'SKIPPED';

    const nodeRecord: NodeRunRecord = {
      run_id: runId,
      node_id: nodeId,
      node_type: node.type,
      attempt: 1,
      status,
      started_at: nodeStartAt,
      ended_at: new Date().toISOString(),
      duration_ms: endTime - startTime,
      inputs_snapshot: mockInputs(node),
      outputs_snapshot: failed ? undefined : mockOutputs(node),
      error: failed ? { code: 'SIM_FAIL', message: `Simulated failure at ${nodeId}` } : undefined,
      action_ref: NODE_TYPE_ACTION_MAP[node.type] || { type: 'simulated' },
    };

    // Add AI metadata for agent nodes
    if (node.type === 'agent' && !failed) {
      nodeRecord.ai_metadata = {
        model: node.runtime?.model || 'unknown',
        prompt_tokens: Math.round(500 + Math.random() * 1500),
        completion_tokens: Math.round(200 + Math.random() * 800),
        confidence: +(0.7 + Math.random() * 0.3).toFixed(2),
      };
    }

    // Add human metadata for human nodes
    if (node.type === 'human' && !failed) {
      nodeRecord.human_metadata = {
        actor: node.role || 'user',
        decision: 'approved',
      };
    }

    record.node_records.push(nodeRecord);
    options.onNodeComplete?.(nodeId, nodeRecord);

    // Handle spawn edges: create child agent records
    if (!failed) {
      const spawnEdges = getOutgoingEdges(nodeId, workflow.edges).filter(e => e.mode === 'spawn');
      for (const spawnEdge of spawnEdges) {
        const childNode = nodeMap.get(spawnEdge.to);
        if (!childNode) continue;
        const count = (spawnEdge as any).spawn_count || 1;
        for (let si = 1; si <= count; si++) {
          const childStart = new Date().toISOString();
          const childDelay = randomDelay(childNode);
          if (options.mode === 'simulated') {
            await new Promise(r => setTimeout(r, Math.min(childDelay, 2000)));
          }
          const childFailed = options.mode === 'simulated' && shouldFail(childNode);
          const childRecord: NodeRunRecord = {
            run_id: runId,
            node_id: count > 1 ? `${childNode.id}#${si}` : childNode.id,
            node_type: childNode.type,
            attempt: 1,
            status: childFailed ? 'FAILED' : 'COMPLETED',
            started_at: childStart,
            ended_at: new Date().toISOString(),
            duration_ms: childDelay,
            inputs_snapshot: mockInputs(childNode),
            outputs_snapshot: childFailed ? undefined : mockOutputs(childNode),
            error: childFailed ? { code: 'SIM_FAIL', message: `Simulated failure at ${childNode.id}#${si}` } : undefined,
            action_ref: NODE_TYPE_ACTION_MAP[childNode.type] || { type: 'simulated' },
            parent_id: nodeId,
            spawn_index: si,
            isolation: 'none',
          };
          if (childNode.type === 'agent' && !childFailed) {
            childRecord.ai_metadata = {
              model: childNode.runtime?.model || 'unknown',
              prompt_tokens: Math.round(500 + Math.random() * 1500),
              completion_tokens: Math.round(200 + Math.random() * 800),
              confidence: +(0.7 + Math.random() * 0.3).toFixed(2),
            };
          }
          record.node_records.push(childRecord);
          options.onNodeComplete?.(childRecord.node_id, childRecord);
        }
      }
    }

    // Update context
    if (!failed) {
      context.outputs[nodeId] = nodeRecord.outputs_snapshot;
    } else {
      hasFailure = true;
      // Check for fallback edges
      const fallbacks = getOutgoingEdges(nodeId, workflow.edges).filter(e => e.mode === 'fallback');
      if (fallbacks.length === 0 && !node.optional) {
        // No fallback, workflow fails
        break;
      }
    }

    // Update progress
    runStore.updateRun(record);
    options.onProgress?.({ ...record });
  }

  // Finalize
  const endNow = new Date().toISOString();
  record.ended_at = endNow;
  record.duration_ms = Date.now() - new Date(record.started_at).getTime();

  const failedNodes = record.node_records.filter(n => n.status === 'FAILED');
  record.status = failedNodes.length > 0 ? 'FAILED' : 'COMPLETED';
  record.result_summary = record.status === 'COMPLETED'
    ? `Successfully completed ${record.node_records.filter(n => n.status === 'COMPLETED').length} nodes`
    : `Failed at node: ${failedNodes[0]?.node_id}`;
  record.error_summary = failedNodes.length > 0
    ? failedNodes.map(n => `${n.node_id}: ${n.error?.message}`).join('; ')
    : undefined;

  runStore.updateRun(record);
  options.onProgress?.(record);

  return record;
}
