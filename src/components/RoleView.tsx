import React from 'react';
import { OsopWorkflow, OsopNode } from '../types/osop';
import { motion } from 'framer-motion';

interface RoleViewProps {
  workflow: OsopWorkflow;
}

export function RoleView({ workflow }: RoleViewProps) {
  // Group nodes by type
  const groups = workflow.nodes.reduce((acc, node) => {
    const type = node.type || 'system';
    if (!acc[type]) acc[type] = [];
    acc[type].push(node);
    return acc;
  }, {} as Record<string, OsopNode[]>);

  const roleColors: Record<string, string> = {
    human: 'bg-blue-50 border-blue-200 text-blue-800',
    agent: 'bg-purple-50 border-purple-200 text-purple-800',
    system: 'bg-slate-50 border-slate-200 text-slate-800',
    db: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className="w-full h-full p-6 overflow-x-auto bg-gray-50">
      <div className="flex gap-6 min-w-max h-full">
        {Object.entries(groups).map(([type, nodes], colIdx) => (
          <div key={type} className="w-80 flex flex-col h-full">
            <div className={`px-4 py-3 rounded-t-lg border-t border-l border-r font-bold uppercase tracking-wider text-sm ${roleColors[type] || 'bg-gray-100 border-gray-200 text-gray-800'}`}>
              {type} Role
            </div>
            <div className={`flex-1 p-4 rounded-b-lg border-b border-l border-r space-y-4 ${roleColors[type]?.replace('text-', 'border-').replace('50', '50/50') || 'bg-white border-gray-200'}`}>
              {nodes.map((node, idx) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (colIdx * 0.1) + (idx * 0.1) }}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                >
                  <div className="font-mono text-xs text-gray-400 mb-1">{node.id}</div>
                  <div className="font-semibold text-gray-900 mb-2">{node.purpose || node.name}</div>
                  {node.explain?.what && (
                    <div className="text-sm text-gray-600 line-clamp-2">{node.explain.what}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
