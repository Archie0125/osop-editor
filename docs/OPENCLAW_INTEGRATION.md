# How to Integrate OSOP with OpenClaw

To let OpenClaw (or any MCP-compatible agent like Claude Desktop) quickly use your OSOP tools, we use the **Model Context Protocol (MCP)**.

This is the fastest and most standard way to give an AI Agent the ability to read, validate, and execute your `.osop` workflows.

## 1. Build the OSOP MCP Server

We have created a Node.js MCP server in `packages/mcp-server/`. This server exposes two tools to the AI:
- `osop_validate`: Checks if a YAML string is a valid OSOP workflow.
- `osop_run`: Executes a workflow file.

To build it:
```bash
cd packages/mcp-server
npm install
npm run build
```

The compiled server will be at `packages/mcp-server/build/index.js`.

## 2. The OpenClaw Skill (`SKILL.md`)

OpenClaw uses a `SKILL.md` file to load capabilities. We have created one for you at `skills/osop/SKILL.md`.

### What is inside `SKILL.md`?

1. **Frontmatter Configuration**: This tells OpenClaw how to start the MCP server.
   ```yaml
   metadata:
     openclaw:
       mcp:
         command: "node"
         args: ["/absolute/path/to/packages/mcp-server/build/index.js"]
   ```
   *(Note: You must update the `args` path in `SKILL.md` to point to your actual absolute path).*

2. **System Prompt (Instructions)**: The markdown body of `SKILL.md` acts as a system prompt. It tells the OpenClaw agent *what* OSOP is, *how* to write it, and *when* to call the `osop_validate` tool.

## 3. Loading it into OpenClaw

1. Open your OpenClaw configuration (usually `openclaw.yaml` or similar).
2. Add the path to the `skills/osop/` directory so OpenClaw loads it on startup.
3. Start OpenClaw.

## 4. Testing the Integration

Once OpenClaw is running with the OSOP skill, you can chat with the agent:

**You:** "Create an OSOP workflow that takes a PDF, uses an agent to extract data, and saves it to a database."

**OpenClaw (Internal Monologue):**
1. *I need to write an OSOP YAML file based on the instructions in my OSOP Skill.*
2. *I will generate the YAML.*
3. *I will call the `osop_validate` tool with the YAML content to make sure I didn't make any syntax errors.*

**OpenClaw (Response):** "I have created and validated the workflow for you. Here is the YAML..."

By using MCP + OpenClaw Skills, you don't need to write complex API integrations. The agent natively understands how to call your local Node.js script via standard I/O (stdio).
