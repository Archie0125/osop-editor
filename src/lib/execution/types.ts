import { OsopNodeType } from '../../types/osop';

// ============================================================
// Execution Record Types — Immutable, Append-Only
// ============================================================

export type RunMode = 'live' | 'dry_run' | 'simulated';
export type RunStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type NodeRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT';

// --- Node Run Record ---

export interface NodeRunRecord {
  run_id: string;
  node_id: string;
  node_type: string;
  attempt: number;
  status: NodeRunStatus;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  inputs_snapshot: Record<string, any>;
  outputs_snapshot?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
  action_ref?: {
    type: 'mcp_tool' | 'api_call' | 'cli_command' | 'human_input' | 'simulated';
    tool_name?: string;
    endpoint?: string;
    command?: string;
  };
  ai_metadata?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    confidence?: number;
  };
  human_metadata?: {
    actor?: string;
    decision?: string;
    notes?: string;
  };
}

// --- Workflow Run Record ---

export interface WorkflowRunRecord {
  run_id: string;
  workflow_id: string;
  workflow_name: string;
  workflow_version: string;
  snapshot_hash: string;
  mode: RunMode;
  status: RunStatus;
  trigger: {
    type: string;
    actor?: string;
    timestamp: string;
  };
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  node_records: NodeRunRecord[];
  variables_snapshot: Record<string, any>;
  result_summary?: string;
  error_summary?: string;
  tags?: string[];
}

// --- Workflow Stats (aggregated) ---

export interface WorkflowStats {
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  node_stats: Record<string, {
    avg_duration_ms: number;
    failure_rate: number;
    timeout_rate: number;
    common_errors: string[];
  }>;
}

// --- Iteration Record ---

export interface IterationRecord {
  iteration_id: string;
  workflow_id: string;
  based_on_runs: string[];
  analysis: {
    slow_steps: Array<{ node_id: string; avg_duration_ms: number }>;
    failure_hotspots: Array<{ node_id: string; failure_rate: number; common_errors: string[] }>;
    bottlenecks: Array<{ node_id: string; reason: string }>;
  };
  suggestions: Array<{
    type: 'optimize' | 'restructure' | 'add_retry' | 'parallelize' | 'remove' | 'split';
    target_node_ids: string[];
    description: string;
  }>;
  proposed_yaml?: string;
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  created_at: string;
  applied_at?: string;
}
