/**
 * .osoplog YAML Parser
 * Parses .osoplog.yaml files into WorkflowRunRecord objects
 * that can be stored in RunStore and replayed in the editor.
 */
import yaml from 'js-yaml';
import { WorkflowRunRecord, NodeRunRecord, RunMode, RunStatus, NodeRunStatus } from './types';

interface OsopLogYaml {
  osoplog_version?: string;
  run_id?: string;
  workflow_id?: string;
  workflow_version?: string;
  mode?: string;
  status?: string;
  trigger?: { type?: string; actor?: string; timestamp?: string };
  started_at?: string;
  ended_at?: string;
  duration_ms?: number;
  runtime?: { agent?: string; model?: string; platform?: string };
  node_records?: Array<{
    node_id: string;
    node_type: string;
    attempt?: number;
    status?: string;
    started_at?: string;
    ended_at?: string;
    duration_ms?: number;
    inputs?: any;
    outputs?: any;
    error?: { code: string; message: string };
    action_ref?: { type: string; tool_name?: string; endpoint?: string; command?: string };
    ai_metadata?: { model?: string; prompt_tokens?: number; completion_tokens?: number; confidence?: number };
    human_metadata?: { actor?: string; decision?: string; notes?: string };
    parent_id?: string;
    spawn_index?: number;
    isolation?: string;
    tools_used?: Array<{ tool: string; calls: number; details?: Array<Record<string, any>> }>;
    reasoning?: { question?: string; alternatives?: Array<{ id: string; description: string }>; selected?: string; confidence?: number };
  }>;
  result_summary?: string;
  error_summary?: string;
  cost?: { total_usd?: number; breakdown?: Array<{ node_id: string; cost_usd: number }> };
}

function mapRunMode(mode?: string): RunMode {
  if (mode === 'live' || mode === 'dry_run' || mode === 'simulated') return mode;
  return 'live';
}

function mapRunStatus(status?: string): RunStatus {
  const valid: RunStatus[] = ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const upper = (status || 'COMPLETED').toUpperCase() as RunStatus;
  return valid.includes(upper) ? upper : 'COMPLETED';
}

function mapNodeStatus(status?: string): NodeRunStatus {
  const valid: NodeRunStatus[] = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'TIMED_OUT'];
  const upper = (status || 'COMPLETED').toUpperCase() as NodeRunStatus;
  return valid.includes(upper) ? upper : 'COMPLETED';
}

export function parseOsopLog(yamlText: string): WorkflowRunRecord | null {
  try {
    const raw = yaml.load(yamlText) as OsopLogYaml;
    if (!raw || typeof raw !== 'object') return null;

    const nodeRecords: NodeRunRecord[] = (raw.node_records || []).map(nr => ({
      run_id: raw.run_id || 'unknown',
      node_id: nr.node_id,
      node_type: nr.node_type || 'system',
      attempt: nr.attempt || 1,
      status: mapNodeStatus(nr.status),
      started_at: nr.started_at || raw.started_at || new Date().toISOString(),
      ended_at: nr.ended_at,
      duration_ms: nr.duration_ms,
      inputs_snapshot: nr.inputs || {},
      outputs_snapshot: nr.outputs,
      error: nr.error,
      action_ref: nr.action_ref as NodeRunRecord['action_ref'],
      ai_metadata: nr.ai_metadata,
      human_metadata: nr.human_metadata,
      parent_id: nr.parent_id,
      spawn_index: nr.spawn_index,
      isolation: nr.isolation,
      tools_used: nr.tools_used,
      reasoning: nr.reasoning,
    }));

    const record: WorkflowRunRecord = {
      run_id: raw.run_id || `imported-${Date.now()}`,
      workflow_id: raw.workflow_id || 'unknown',
      workflow_name: raw.workflow_id || 'Imported Log',
      workflow_version: raw.workflow_version || '0.0.0',
      snapshot_hash: '00000000',
      mode: mapRunMode(raw.mode),
      status: mapRunStatus(raw.status),
      trigger: {
        type: raw.trigger?.type || 'manual',
        actor: raw.trigger?.actor,
        timestamp: raw.trigger?.timestamp || raw.started_at || new Date().toISOString(),
      },
      started_at: raw.started_at || new Date().toISOString(),
      ended_at: raw.ended_at,
      duration_ms: raw.duration_ms,
      node_records: nodeRecords,
      variables_snapshot: {},
      result_summary: raw.result_summary,
      error_summary: raw.error_summary,
    };

    return record;
  } catch {
    return null;
  }
}

/**
 * Check if a filename looks like an osoplog file.
 */
export function isOsopLogFile(filename: string): boolean {
  return /\.osoplog(\.(yaml|yml))?$/i.test(filename);
}
