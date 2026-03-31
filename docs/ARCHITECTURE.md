# OSOP (Open Standard Operating Process) Architecture Design

This document outlines the core architecture of the OSOP Engine, designed to be a robust, scalable, and protocol-first system for executing Human-AI workflows.

## 1. Core Philosophy

- **Single Source of Truth (SSOT)**: The `.osop` YAML/JSON file is the only source of truth. It defines the graph, the contracts, the schemas, and the security policies.
- **Event-Driven & Durable**: Inspired by Temporal and Event Sourcing. Every state transition is recorded in an immutable ledger. If a node crashes, the engine can replay the ledger to resume execution.
- **Agent-First Execution, Human-First Visualization**: The engine speaks JSON/RPC (via MCP) to Agents, but provides rich visual views (Graph, Story, Role) for human stakeholders.

## 2. System Components

The OSOP ecosystem is divided into five distinct layers:

### A. Definition Layer (The Protocol)
- **Schema Registry**: JSON Schema definitions for inputs, outputs, and message envelopes.
- **Workflow AST**: The parsed representation of nodes, edges, and policies.

### B. Compilation Layer (The IR)
- **Parser**: Converts YAML/JSON into the Abstract Syntax Tree (AST). Validates against `osop.schema.json`.
- **Compiler**: Transforms the AST into an **Execution Plan** (a Directed Acyclic Graph - DAG). It resolves `extends` (inheritance) and flattens sub-workflows.

### C. Execution Layer (The Engine)
- **State Machine**: Manages the lifecycle of a `WorkflowRun` and `NodeRun`.
  - States: `PENDING` -> `RUNNING` -> `SUSPENDED` (waiting for human/async) -> `COMPLETED` | `FAILED`.
- **Scheduler**: Handles `conditional`, `parallel`, and `loop` edges. Determines which node is ready to run next based on the Execution Plan and current state.
- **Adapters (Plugin Architecture)**:
  - The engine itself does not know how to call an LLM or execute a SQL query.
  - It delegates execution to Adapters: `AgentAdapter`, `ApiAdapter`, `DbAdapter`, `HumanAdapter`.
  - Adapters return a standardized `ResultEnvelope`.

### D. Ledger Layer (The Audit Trail)
- **Append-Only Log**: Every state change emits an event (e.g., `NodeStarted`, `NodeCompleted`, `HumanApprovalRequested`).
- **Artifact Store**: Large inputs/outputs (e.g., PDF files, large JSON payloads) are stored in an Object Store (S3/MinIO). The Ledger only stores the `artifact_ref` (hash/URI) to keep the database fast.

### E. Interface Layer (MCP & UI)
- **OSOP MCP Server**: Exposes tools like `osop.run`, `osop.validate`, `osop.resume` to AI Agents (e.g., Claude, OpenClaw).
- **OSOP Studio (React)**: The visual IDE for humans to design, monitor, and approve workflows.

## 3. The Node Lifecycle (State Machine)

When a node is scheduled to run, it goes through the following strict state machine:

1. **INITIALIZED**: The node is added to the execution queue.
2. **READY**: All incoming edge dependencies are met. Inputs are resolved.
3. **RUNNING**: The Adapter is invoked.
4. **SUSPENDED**: (Optional) The node requires asynchronous completion (e.g., a `human` node waiting for approval, or an `agent` node waiting for a long-running task).
5. **RETRYING**: The Adapter threw an error, but the `retry_policy` allows another attempt.
6. **COMPLETED**: The Adapter returned a success envelope. Outputs are validated against the schema.
7. **FAILED**: Max retries exceeded, or a fatal error occurred. Triggers `failure_modes` routing.

## 4. Security & Governance

- **Idempotency**: Every execution generates a unique `run_id`. Adapters (especially `api` and `db`) use `run_id + node_id` as an idempotency key to prevent double-execution during retries.
- **Approval Gates**: High-risk nodes (e.g., `db.write`, `deploy.production`) are intercepted by the engine. The state transitions to `SUSPENDED` and emits an `ApprovalRequested` event. Execution only resumes when an authorized role submits an `Approve` event.
- **Secret Management**: `.osop` files NEVER contain raw secrets. They contain references (e.g., `secrets: [GITHUB_TOKEN]`). The Engine resolves these at runtime via a Secrets Provider (Vault, AWS Secrets Manager).

## 5. Monorepo Structure (Proposed)

To manage this protocol effectively, the codebase should be structured as a monorepo:

```text
osop-workspace/
├── packages/
│   ├── schema/          # JSON Schema definitions & generated TS types
│   ├── core/            # Parser, Compiler, and Execution Plan logic
│   ├── engine/          # State Machine, Scheduler, and Ledger
│   ├── adapters/        # Official plugins (agent, api, db, human)
│   ├── cli/             # Command-line interface (osop validate/run)
│   └── mcp-server/      # Model Context Protocol integration
├── apps/
│   └── studio/          # React-based visualizer (OSOP Studio)
└── docs/                # RFCs and Architecture documentation
```
