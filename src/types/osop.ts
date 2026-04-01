// ============================================================
// OSOP Protocol v1.0 — Complete Type System
// Supports ALL workflow domains worldwide
// ============================================================

// --- IO ---

export interface OsopIO {
  name: string;
  type?: string;
  schema?: string;
  required?: boolean;
  description?: string;
}

// --- Node Types ---
// 15 core types + subtype for domain specialization

export type OsopNodeType =
  // Actors
  | 'human'       // Human performer
  | 'agent'       // AI/LLM agent
  | 'company'     // Organization (B2B)
  | 'department'  // Department within org
  // Technical
  | 'api'         // HTTP/gRPC/GraphQL call
  | 'cli'         // Command-line operation
  | 'db'          // Database operation
  | 'git'         // Version control
  | 'docker'      // Container operation
  | 'cicd'        // CI/CD pipeline step
  | 'infra'       // Infrastructure provisioning
  | 'mcp'         // MCP tool call
  // Flow control
  | 'system'      // Generic system operation
  | 'event'       // Event trigger/signal
  | 'gateway'     // Routing gateway (XOR/AND/OR)
  | 'data';       // Data transformation

// --- Edge Modes ---
// 13 modes covering all flow patterns

export type OsopEdgeMode =
  // Control flow
  | 'sequential'    // Default: A then B
  | 'conditional'   // If condition, then B
  | 'parallel'      // Fork: execute concurrently
  | 'loop'          // Repeat while condition
  | 'event'         // On external event
  // Error handling
  | 'fallback'      // On source failure, try target
  | 'error'         // On specific error condition
  | 'timeout'       // On source timeout
  | 'compensation'  // Saga: undo completed step on downstream failure
  // Inter-system
  | 'message'       // Cross-org message exchange (EDI/API)
  | 'dataflow'      // Data movement (separate from control)
  | 'signal'        // External hold/release gate
  // Distribution
  | 'weighted'      // Percentage-based routing (A/B, canary)
  // Agent orchestration
  | 'spawn';        // Parent spawns child agent(s)

// --- Node Definition ---

export interface OsopNode {
  id: string;
  name?: string;
  type: OsopNodeType;
  subtype?: string;           // Domain-specific: 'approval', 'llm', 'rest', 'smart_contract', etc.
  role?: string;
  owner?: string;
  purpose?: string;
  tags?: string[];            // Node-level categorization

  explain?: {
    why?: string;
    what?: string;
    result?: string;
  };

  // Execution
  runtime?: Record<string, any>;
  inputs?: OsopIO[];
  outputs?: OsopIO[];
  success_criteria?: string[];
  failure_modes?: string[];
  timeout_sec?: number;

  // Retry
  retry_policy?: {
    max_retries: number;
    strategy: string;         // 'fixed' | 'exponential_backoff' | 'linear'
    backoff_sec: number;
  };

  // Idempotency
  idempotency?: {
    enabled: boolean;
    key?: string;             // CEL expression for idempotency key
  };

  // Handoff (agent-to-agent, agent-to-human)
  handoff?: {
    summary_for_next_node?: string;
    expected_output?: string;
    escalation?: string;      // node_id to escalate to
  };

  // B2B: company/org
  company?: {
    name: string;
    role: string;             // 'supplier' | 'buyer' | 'partner' | 'regulator' | 'auditor'
    contact?: string;
    sla?: string;
  };

  // Pool/Lane for swimlane rendering
  pool?: string;              // Organization pool
  lane?: string;              // Department/role lane within pool

  // Approval gate
  approval_gate?: {
    required: boolean;
    approver_role?: string;
    timeout_hours?: number;
  };

  // --- NEW: Universal workflow fields ---

  // Priority (triage, incident severity, SLA tier)
  priority?: 'critical' | 'high' | 'medium' | 'low' | number;

  // Data classification (HIPAA, PCI, military clearance)
  classification?: 'public' | 'internal' | 'confidential' | 'secret' | 'top_secret' | string;

  // Cost tracking (budget attribution)
  cost?: {
    estimated?: number;
    currency?: string;
    budget_ref?: string;      // Link to funding source/grant
  };

  // Hard preconditions (safety interlocks, rules of engagement)
  preconditions?: string[];   // CEL expressions, ALL must be true before execution

  // Calendar/scheduling constraint
  valid_window?: {
    earliest?: string;        // ISO datetime or CEL expression
    latest?: string;          // ISO datetime or CEL expression
    business_hours_only?: boolean;
  };

  // Rich actor assignment (four-eyes, quorum, segregation of duties)
  actors?: {
    min?: number;             // Minimum actors required (quorum)
    max?: number;
    assignment?: 'any' | 'all' | 'pool';
    pool_ref?: string;        // Reference to resource pool
    segregation_from?: string[]; // Node IDs whose actors must differ
  };

  // Optional node (can be skipped without failure)
  optional?: boolean;

  // Sub-agent orchestration (OSP-0001)
  parent?: string;              // Parent node ID that spawns this agent
  spawn_policy?: {
    max_children?: number;
    child_tools?: string[];
    can_spawn_children?: boolean;
  };

  // Security (node-level)
  security?: {
    permissions?: string[];
    secrets?: string[];
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    auth?: string;
  };

  // Observability (node-level)
  observability?: {
    log?: boolean;
    metrics?: string[];
  };
}

// --- Edge Definition ---

export interface OsopEdge {
  from: string;
  to: string;
  mode?: OsopEdgeMode;
  when?: string;              // CEL condition expression
  label?: string;

  // Data contract
  schema_ref?: string;        // JSON Schema reference
  protocol?: string;          // API, EDI, webhook, email, gRPC, etc.

  // SLA on edge transition
  sla?: {
    target_duration?: string; // e.g. "24h", "5m"
    breach_action?: string;   // node_id or action on breach
    penalty?: string;
  } | string;                 // Shorthand: just a duration string

  // Priority (evaluation order for multiple edges from same source)
  priority?: number;

  // Data transformation on edge
  transform?: {
    mapping?: Record<string, string>;  // field renaming/mapping
    filter?: string[];                 // fields to include (whitelist)
    exclude?: string[];                // fields to exclude (blacklist)
    anonymize?: string[];              // fields to anonymize (peer review blinding)
  };

  // Intentional delay (regulatory waiting periods, cooling-off, debounce)
  delay?: string;             // Duration string: "30d", "24h", "5m"

  // Weighted routing (A/B testing, canary)
  weight?: number;            // Percentage: 0-100

  // Compensation target (saga pattern)
  compensates?: string;       // node_id this edge undoes

  // Agent orchestration
  spawn_count?: number;       // Number of child agents to spawn (default 1)
}

// --- Metadata ---

export interface OsopMetadata {
  creation_date?: string;
  version?: string;
  change_summary?: string;
  [key: string]: any;         // Extensible
}

// --- Compliance ---

export interface OsopCompliance {
  frameworks?: string[];      // e.g. ['HIPAA', 'SOX', 'PCI-DSS', 'GDPR']
  jurisdiction?: string;      // e.g. 'US', 'EU', 'TW'
  controls?: Array<{
    id: string;
    description: string;
    node_refs: string[];      // Which nodes satisfy this control
  }>;
}

// --- Resource Pool ---

export interface OsopResource {
  id: string;
  type: string;               // 'machine', 'api_quota', 'room', 'license', etc.
  capacity?: number;          // Max concurrent users
  shared?: boolean;
}

// --- Calendar ---

export interface OsopCalendar {
  timezone?: string;          // e.g. 'Asia/Taipei'
  business_hours?: {
    start: string;            // e.g. '09:00'
    end: string;              // e.g. '18:00'
    days: string[];           // e.g. ['mon','tue','wed','thu','fri']
  };
  holidays?: string[];        // ISO dates
}

// --- SLA (workflow-level) ---

export interface OsopSLA {
  target_duration?: string;   // e.g. "4h", "2d"
  breach_action?: string;
}

// --- Trigger ---

export interface OsopTrigger {
  type: string;               // 'webhook', 'schedule', 'event', 'manual', 'api', 'file_watch'
  config?: Record<string, any>;
}

// --- Top-Level Workflow ---

export interface OsopWorkflow {
  osop_version: string;
  id: string;
  name: string;
  description?: string;
  version?: string;
  owner?: string;
  visibility?: 'public' | 'private';
  tags?: string[];

  metadata?: OsopMetadata;
  nodes: OsopNode[];
  edges: OsopEdge[];

  // Schema definitions for reuse
  schemas?: Record<string, any>;

  // Roles referenced in the workflow
  roles?: string[];

  // Triggers that start the workflow
  triggers?: OsopTrigger[];

  // Workflow-level inputs/outputs
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;

  // Message contracts between nodes
  contracts?: Record<string, any>;

  // Visualization modes
  views?: string[];           // e.g. ['graph', 'story', 'role', 'gantt', 'sankey']

  // --- NEW: Universal workflow support ---

  // Compliance mapping (regulated industries)
  compliance?: OsopCompliance;

  // Shared resource pools (capacity constraints)
  resources?: OsopResource[];

  // Workflow-level variables (mutable shared state)
  variables?: Record<string, {
    type: string;
    default?: any;
    description?: string;
  }>;

  // Sub-workflow references (composition)
  sub_workflows?: Record<string, {
    ref: string;              // OSOP workflow ID or file path
    inputs?: Record<string, string>;   // Mapping from parent to child inputs
    outputs?: Record<string, string>;  // Mapping from child to parent outputs
  }>;

  // Workflow-level SLA
  sla?: OsopSLA;

  // Business calendar
  calendar?: OsopCalendar;

  // Security (workflow-level)
  security?: Record<string, any>;

  // Retry policy (global default)
  retry?: Record<string, any>;

  // Global timeout
  timeout?: string;

  // Ledger/Audit
  ledger?: Record<string, any>;

  // Observability
  observability?: Record<string, any>;

  // Evolution/Deprecation
  evolution?: Record<string, any>;

  // Extensions (x-* keys)
  extensions?: Record<string, any>;
}
