export interface OsopIO {
  name: string;
  type?: string;
  schema?: string;
  description?: string;
}

export interface OsopNode {
  id: string;
  name?: string;
  type: 'human' | 'agent' | 'api' | 'cli' | 'db' | 'git' | 'docker' | 'cicd' | 'system' | 'mcp';
  role?: string;
  purpose?: string;
  explain?: {
    why?: string;
    what?: string;
    result?: string;
  };
  runtime?: any;
  inputs?: OsopIO[];
  outputs?: OsopIO[];
  success_criteria?: string[];
}

export interface OsopEdge {
  from: string;
  to: string;
  mode?: string;
  when?: string;
  label?: string;
}

export interface OsopMetadata {
  creation_date?: string;
  version?: string;
  change_summary?: string;
}

export interface OsopWorkflow {
  osop_version: string;
  id: string;
  name: string;
  metadata?: OsopMetadata;
  nodes: OsopNode[];
  edges: OsopEdge[];
}
