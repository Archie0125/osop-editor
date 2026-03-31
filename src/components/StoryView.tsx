import React from 'react';
import { OsopWorkflow } from '../types/osop';
import { User, Bot, Database, Server, Terminal, GitBranch, Box, Activity, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoryViewProps {
  workflow: OsopWorkflow;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'human': return <User className="w-5 h-5 text-blue-500" />;
    case 'agent': return <Bot className="w-5 h-5 text-purple-500" />;
    case 'db': return <Database className="w-5 h-5 text-green-500" />;
    case 'api': return <Server className="w-5 h-5 text-orange-500" />;
    case 'cli': return <Terminal className="w-5 h-5 text-gray-700" />;
    case 'git': return <GitBranch className="w-5 h-5 text-red-500" />;
    case 'docker': return <Box className="w-5 h-5 text-cyan-500" />;
    case 'cicd': return <Activity className="w-5 h-5 text-indigo-500" />;
    case 'system': return <Settings className="w-5 h-5 text-slate-500" />;
    default: return <Settings className="w-5 h-5 text-gray-400" />;
  }
};

export function StoryView({ workflow }: StoryViewProps) {
  // Sort nodes based on edges (simple topological sort for linear stories)
  // For this demo, we assume the order in the array is the story order.
  
  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-8 text-gray-900 font-serif italic">
        The Story of: {workflow.name || workflow.id}
      </h2>
      
      <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
        {workflow.nodes.map((node, idx) => (
          <motion.div 
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative pl-8"
          >
            <div className="absolute -left-[13px] top-1 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
              {getIcon(node.type)}
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Step {idx + 1}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {node.purpose || node.name || node.id}
                </h3>
              </div>
              
              <p className="text-gray-600 leading-relaxed">
                {node.explain?.what || `The ${node.type} executes the ${node.id} process.`}
              </p>
              
              {(node.inputs || node.outputs) && (
                <div className="mt-4 flex flex-col gap-2">
                  {node.inputs && node.inputs.length > 0 && (
                    <div className="text-sm">
                      <span className="font-semibold text-slate-500">Receives: </span>
                      <span className="text-slate-700">{node.inputs.map(i => i.name).join(', ')}</span>
                    </div>
                  )}
                  {node.outputs && node.outputs.length > 0 && (
                    <div className="text-sm">
                      <span className="font-semibold text-slate-500">Produces: </span>
                      <span className="text-slate-700">{node.outputs.map(o => o.name).join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {node.runtime && (
                <div className="mt-4 text-xs font-mono text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                  Runtime: {JSON.stringify(node.runtime)}
                </div>
              )}

              {workflow.edges.filter(e => e.from === node.id).length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  {workflow.edges.filter(e => e.from === node.id).map((edge, i) => {
                    const targetNode = workflow.nodes.find(n => n.id === edge.to);
                    const targetName = targetNode?.purpose || targetNode?.name || edge.to;
                    
                    if (edge.mode === 'conditional') {
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 text-amber-800 p-2 rounded border border-amber-100">
                          <span className="font-bold">IF</span>
                          <span className="font-mono bg-amber-100/50 px-1.5 py-0.5 rounded">{edge.when || edge.label || 'condition'}</span>
                          <span className="font-bold">THEN</span>
                          <span className="flex items-center gap-1">
                            go to <span className="font-semibold">{targetName}</span>
                          </span>
                        </div>
                      );
                    }
                    
                    if (edge.mode === 'loop') {
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm bg-purple-50 text-purple-800 p-2 rounded border border-purple-100">
                          <span className="font-bold">LOOP IF</span>
                          <span className="font-mono bg-purple-100/50 px-1.5 py-0.5 rounded">{edge.when || edge.label || 'condition'}</span>
                          <span className="font-bold">THEN</span>
                          <span className="flex items-center gap-1">
                            return to <span className="font-semibold">{targetName}</span>
                          </span>
                        </div>
                      );
                    }

                    if (edge.mode === 'fallback') {
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm bg-red-50 text-red-800 p-2 rounded border border-red-100">
                          <span className="font-bold">ON ERROR</span>
                          <span className="font-bold">THEN</span>
                          <span className="flex items-center gap-1">
                            fallback to <span className="font-semibold">{targetName}</span>
                          </span>
                        </div>
                      );
                    }

                    if (edge.mode === 'parallel') {
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm bg-green-50 text-green-800 p-2 rounded border border-green-100">
                          <span className="font-bold">PARALLEL</span>
                          <span className="flex items-center gap-1">
                            start <span className="font-semibold">{targetName}</span>
                          </span>
                        </div>
                      );
                    }

                    // Default sequential
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600 p-2">
                        <span className="font-bold text-gray-400">NEXT</span>
                        <span className="flex items-center gap-1">
                          go to <span className="font-semibold text-gray-700">{targetName}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
