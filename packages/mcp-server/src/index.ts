import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import yaml from "js-yaml";
import fs from "fs/promises";
import path from "path";

// 1. Initialize the MCP Server
const server = new Server(
  {
    name: "osop-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 2. Define the Tools available to OpenClaw (and other Agents)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "osop_validate",
        description: "Validate an OSOP workflow YAML string or file path.",
        inputSchema: {
          type: "object",
          properties: {
            yaml_content: { type: "string", description: "The raw YAML content of the OSOP workflow." },
            file_path: { type: "string", description: "Absolute path to the .osop file (optional)." }
          },
        },
      },
      {
        name: "osop_run",
        description: "Execute an OSOP workflow.",
        inputSchema: {
          type: "object",
          properties: {
            file_path: { type: "string", description: "Absolute path to the .osop file to run." },
            inputs: { type: "object", description: "JSON object containing the inputs for the workflow." }
          },
          required: ["file_path"]
        },
      }
    ],
  };
});

// 3. Implement the Tool Logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "osop_validate") {
    try {
      let content = args?.yaml_content as string;
      if (!content && args?.file_path) {
        content = await fs.readFile(args.file_path as string, "utf-8");
      }

      if (!content) {
        throw new Error("Either yaml_content or file_path must be provided.");
      }

      // Basic parsing to validate YAML syntax
      const doc = yaml.load(content) as any;
      
      // Basic OSOP rules check
      const errors = [];
      if (!doc.osop_version) errors.push("Missing 'osop_version'");
      if (!doc.nodes || !Array.isArray(doc.nodes)) errors.push("Missing or invalid 'nodes' array");
      if (!doc.edges || !Array.isArray(doc.edges)) errors.push("Missing or invalid 'edges' array");

      if (errors.length > 0) {
        return {
          content: [{ type: "text", text: `Validation Failed:\n- ${errors.join("\n- ")}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: `Validation Passed! Found ${doc.nodes.length} nodes and ${doc.edges.length} edges.` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (name === "osop_run") {
    // Placeholder for actual execution engine
    const filePath = args?.file_path as string;
    const inputs = args?.inputs || {};
    
    return {
      content: [{ 
        type: "text", 
        text: `[Mock Run] Successfully started workflow from ${filePath}.\nRun ID: wr_mock_${Date.now()}\nInputs received: ${JSON.stringify(inputs)}` 
      }],
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

// 4. Start the Server using STDIO transport (Standard for MCP)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OSOP MCP Server running on stdio");
}

main().catch(console.error);
