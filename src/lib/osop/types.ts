import { z } from 'zod';

// ==========================================
// 1. Definition Layer (The OSOP AST)
// ==========================================

export type NodeType =
  | 'human' | 'agent' | 'api' | 'cli' | 'db' | 'git' | 'docker' | 'cicd' | 'mcp' | 'system'
  | 'infra' | 'company' | 'department' | 'event' | 'gateway' | 'data';

export type EdgeMode =
  | 'sequential' | 'conditional' | 'parallel' | 'loop' | 'event'
  | 'fallback' | 'error' | 'timeout' | 'compensation'
  | 'message' | 'dataflow' | 'signal' | 'weighted';

export interface IOSOPNode {
  id: string;
  type: NodeType;
  purpose: string;
  role?: string;
  inputs?: Array<{ name: string; schema: string; required?: boolean }>;
  outputs?: Array<{ name: string; schema: string; explain?: { why: string; what: string; result: string } }>;
  success_criteria?: string[];
  failure_modes?: string[];
  handoff?: {
    summary_for_next_node?: string;
    expected_output?: string;
    escalation?: string;
  };
  runtime?: Record<string, any>;
  retry_policy?: { max_retries: number; strategy: string; backoff_sec: number };
}

export interface IOSOPEdge {
  from: string;
  to: string;
  mode?: EdgeMode;
  when?: string;
  label?: string;
}

export interface IOSOPWorkflow {
  osop_version: string;
  id: string;
  name: string;
  description?: string;
  nodes: IOSOPNode[];
  edges: IOSOPEdge[];
  schemas?: Record<string, any>;
}

// ==========================================
// 2. Execution Layer (State Machine)
// ==========================================

export type NodeStatus = 'INITIALIZED' | 'READY' | 'RUNNING' | 'SUSPENDED' | 'RETRYING' | 'COMPLETED' | 'FAILED';

export interface IExecutionState {
  run_id: string;
  workflow_id: string;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  nodes: Record<string, INodeState>;
  context: Record<string, any>; // Global variables/outputs
}

export interface INodeState {
  id: string;
  status: NodeStatus;
  attempt: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
  output_ref?: string;
}

// ==========================================
// 3. Ledger Layer (Immutable Records)
// ==========================================

export interface IWorkflowRunRecord {
  run_id: string;
  workflow_id: string;
  version: string;
  trace_id: string;
  status: string;
  started_at: string;
  ended_at?: string;
}

export interface INodeRunRecord {
  run_id: string;
  node_id: string;
  attempt: number;
  status: string;
  started_at: string;
  ended_at?: string;
  input_snapshot: any;
  output_snapshot?: any;
  error?: string;
}
