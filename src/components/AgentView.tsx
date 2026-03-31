import React from 'react';
import { OsopWorkflow } from '../types/osop';

interface AgentViewProps {
  workflow: OsopWorkflow;
}

export function AgentView({ workflow }: AgentViewProps) {
  // Compress the workflow for an LLM/Agent context
  const compressed = {
    goal: workflow.name,
    nodes: workflow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      purpose: n.purpose,
      ...(n.inputs ? { inputs: n.inputs } : {}),
      ...(n.outputs ? { outputs: n.outputs } : {}),
      ...(n.runtime ? { runtime: n.runtime } : {})
    })),
    flow: workflow.edges.map(e => `${e.from} -> ${e.to}`)
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-6 overflow-y-auto font-mono text-sm leading-relaxed">
      <div className="mb-4 text-green-400">
        # OSOP Compressed Context for Agent Execution
      </div>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(compressed, null, 2)}
      </pre>
    </div>
  );
}
