# OSOP Editor

**Part of SOP Doc.** See any .osop workflow as an interactive visual graph.

Drag and drop .osop files to visualize them. 5 view modes (graph, story, role, agent, code). Built-in risk analysis. Execution replay when you load an .osoplog alongside. The viewer for SOP Doc.

## Key Features

### Risk Analysis (NEW)
- **Risk Score (0-100)** with verdict: `SAFE` / `CAUTION` / `WARNING` / `DANGER`
- **8 security rules**: missing approval gates, overly broad permissions, destructive commands, hardcoded secrets, cost exposure, segregation of duties, missing error handling, missing timeouts
- **Visual overlays**: red/orange/yellow node borders, animated CRITICAL badges
- **Risk Panel**: findings grouped by severity, per-node breakdown, permissions & secrets summary

### Multi-View Visualization
- **Graph View**: Interactive node-edge diagram (ReactFlow) with drag, zoom, and risk overlays
- **Story View**: Human-readable narrative of each step's what & why
- **Role View**: Swimlane grouped by actor (human, AI, system)
- **Agent View**: Compressed SOP context for AI agent execution
- **MCP / CLI Code**: Generated server and CLI skeleton

### Editor
- Real-time YAML editing with instant parse feedback
- Drag & drop `.osop` file loading
- 18 built-in example templates
- AI-powered workflow generation (Gemini)
- HTML report export
- i18n: English, Traditional Chinese (zh-TW), Japanese (ja)

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Try the Risk Analysis
1. Open the editor at [osop-editor.vercel.app](https://osop-editor.vercel.app)
2. Load the **"Risk Analysis Demo"** from the Examples dropdown
3. Click the **Risk** button in the top-right of the view panel
4. See the risk score, findings, and visual overlays on the graph

## Tech Stack

- React 19 + Vite 6 + TypeScript 5.8
- Tailwind CSS 4 + Lucide React icons
- @xyflow/react (ReactFlow) for graph visualization
- dagre for auto-layout
- Framer Motion for animations
- js-yaml for OSOP parsing

## OSOP Ecosystem

| Repo | Description |
|------|-------------|
| [osop-spec](https://github.com/Archie0125/osop-spec) | Protocol specification v1.0 |
| [osop-editor](https://github.com/Archie0125/osop-editor) | This repo — visual editor + risk analysis |
| [osop-mcp](https://github.com/Archie0125/osop-mcp) | MCP server with 9 tools (validate, risk_assess, render, etc.) |
| [osop-examples](https://github.com/Archie0125/osop-examples) | 30+ workflow templates across 10 domains |
| [osop-sdk-js](https://github.com/Archie0125/osop-sdk-js) | JavaScript/TypeScript SDK |
| [osop-sdk-py](https://github.com/Archie0125/osop-sdk-py) | Python SDK |

## What is OSOP?

**OSOP (Open Standard Operating Protocol)** is the OpenAPI of workflows. It standardizes how workflows, SOPs, and automation pipelines are defined, validated, and executed — across AI agents, CI/CD tools, and enterprise processes.

The first killer app: **see what any workflow does and assess its risks before running it.**

## License

MIT
