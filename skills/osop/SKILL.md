---
name: osop
description: "Execute, validate, test, and evolve OSOP workflows via MCP server"
metadata:
  openclaw:
    mcp:
      command: "node"
      args: ["/path/to/your/osop-workspace/packages/mcp-server/build/index.js"]
      env:
        OSOP_LOG_LEVEL: "info"
---

# OSOP (Open Standard Operating Process) Skill

## What this skill does
This skill allows you (the Agent) to interact with the OSOP Engine. You can:
1. **Validate**: Check if a generated `.osop.yaml` file is syntactically correct and follows the OSOP Schema.
2. **Run**: Execute a workflow and get the Run ID and logs.

## How to use it
When a user asks you to create a workflow, you should:
1. Write the YAML content.
2. Call the `osop_validate` tool with the `yaml_content` to ensure you didn't make a mistake.
3. If the user asks you to run it, save it to a file and call `osop_run` with the `file_path`.

## Rules for OSOP Generation
- Always include `osop_version: "1.0"`, `id`, `name`, `nodes`, and `edges`.
- Every node MUST have an `id`, `type`, and `purpose`.
- Agent nodes MUST declare `inputs` and `outputs` schemas.
- High-risk nodes (e.g., `db.write`, `git.push`) MUST have `approval_gate: { required: true }`.
