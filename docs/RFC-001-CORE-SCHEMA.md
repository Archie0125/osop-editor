# RFC-001: OSOP Core Schema v1.0

**Status**: Draft
**Author**: OSOP Core Team
**Created**: 2026-03-30

## 1. Summary
This RFC proposes the initial version (v1.0.0) of the Open Standard Operating Process (OSOP) JSON Schema. The goal is to establish a unified, declarative language for defining Human-AI workflows that are executable by Agents and readable by humans.

## 2. Motivation
Current workflow engines (e.g., GitHub Actions, Temporal, BPMN) are either too focused on CI/CD, too code-heavy, or lack native support for AI Agent contracts (schemas, confidence scores, handoffs). OSOP bridges this gap by making the *contract* between nodes a first-class citizen.

## 3. Core Concepts

### 3.1. The `.osop` File
The single source of truth. It defines the `nodes` (actors), `edges` (control flow), and `schemas` (data contracts).

### 3.2. Node Types
We propose the following initial node types:
- `human`: Requires manual intervention, approval, or data entry.
- `agent`: An LLM-powered actor (e.g., Claude, GPT-4) that performs reasoning or extraction.
- `api`: A deterministic HTTP/REST call.
- `cli`: A shell command execution.
- `db`: A database operation (query/mutation).
- `git`: Version control operations.
- `docker`: Containerized execution for reproducible tasks.
- `cicd`: Triggers to external CI/CD pipelines.
- `mcp`: Invocation of a Model Context Protocol tool.
- `system`: Control flow nodes (e.g., routers, aggregators).

### 3.3. The Contract Layer
Every node MUST define its `purpose`.
Nodes that produce or consume data MUST define `inputs` and `outputs` referencing a JSON Schema.
Agent nodes SHOULD define `success_criteria` and `failure_modes` to bound their non-deterministic behavior.

### 3.4. Handoffs
When transitioning between actors (e.g., Agent -> Human, or Agent A -> Agent B), a `handoff` block provides context:
```yaml
handoff:
  summary_for_next_node: "Extracted 5 metrics. 1 requires human review due to low confidence."
  expected_output: "Validated metrics payload"
```

## 4. Schema Definition
The formal JSON Schema is maintained in `spec/osop.schema.json`. It uses Draft 2020-12.

## 5. Unresolved Questions
- **Expression Language**: Should `when` conditions in edges use CEL (Common Expression Language), JSONata, or a restricted JavaScript sandbox? (Currently leaning towards CEL for safety and performance).
- **Artifact Storage**: How do we standardize the URI format for `file_ref` schemas across different storage providers (S3, GCS, local)?

## 6. Next Steps
1. Finalize the JSON Schema based on community feedback.
2. Implement the reference Parser and Validator in TypeScript.
3. Build the OSOP Studio visualizer to prove the "Human-first" value proposition.
