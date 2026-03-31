import React from 'react';

export function McpCliSkeleton() {
  return (
    <div className="w-full h-full bg-[#0d1117] text-[#c9d1d9] p-6 overflow-y-auto font-mono text-sm">
      <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">
        OSOP MCP Server & CLI Skeleton
      </h2>
      
      <div className="space-y-8">
        <section>
          <h3 className="text-green-400 mb-2"># 1. osop-mcp-server/server.py (Python MCP Server)</h3>
          <pre className="bg-[#161b22] p-4 rounded-lg border border-gray-700 overflow-x-auto">
{`from mcp.server.fastmcp import FastMCP
from engine.parser import parse_osop
from engine.executor import execute_workflow

mcp = FastMCP("OSOP Server")

@mcp.tool()
def run_osop(workflow_yaml: str) -> str:
    """Execute an OSOP workflow."""
    workflow = parse_osop(workflow_yaml)
    result = execute_workflow(workflow)
    return f"Execution completed: {result.status}"

@mcp.tool()
def validate_osop(workflow_yaml: str) -> str:
    """Validate OSOP file syntax and schema."""
    try:
        parse_osop(workflow_yaml)
        return "Valid OSOP workflow."
    except Exception as e:
        return f"Validation failed: {str(e)}"

if __name__ == "__main__":
    mcp.run()`}
          </pre>
        </section>

        <section>
          <h3 className="text-blue-400 mb-2"># 2. osop-cli/index.ts (Node.js CLI)</h3>
          <pre className="bg-[#161b22] p-4 rounded-lg border border-gray-700 overflow-x-auto">
{`#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import { parseOsop } from '../lib/osop-parser';
import { OsopEngine } from '../lib/engine';

const program = new Command();

program
  .name('osop')
  .description('Process Operating System CLI')
  .version('1.0.0');

program.command('run')
  .description('Run an OSOP workflow file')
  .argument('<file>', 'path to .osop file')
  .action(async (file) => {
    const yamlStr = fs.readFileSync(file, 'utf-8');
    const workflow = parseOsop(yamlStr);
    
    console.log(\`🚀 Starting workflow: \${workflow.name}\`);
    const engine = new OsopEngine(workflow);
    await engine.execute();
    console.log('✅ Workflow completed successfully');
  });

program.parse();`}
          </pre>
        </section>
      </div>
    </div>
  );
}
