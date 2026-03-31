import React from 'react';
import { OsopWorkflow } from '../types/osop';
import { CheckCircle2, Clock, ShieldCheck, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface LedgerViewProps {
  workflow: OsopWorkflow;
}

export function LedgerView({ workflow }: LedgerViewProps) {
  // Mock a completed run ledger based on the current workflow
  const runId = `wr_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = new Date(Date.now() - 1000 * 60 * 5); // 5 mins ago

  return (
    <div className="w-full h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        
        {/* Ledger Header */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                Process Ledger Record
              </h2>
              <p className="text-sm text-slate-500 mt-1">Immutable execution trace for auditing, debugging, and AI evolution.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-slate-400">RUN ID</div>
              <div className="text-sm font-mono font-bold text-slate-700">{runId}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-500 uppercase">Workflow</div>
              <div className="font-medium text-slate-900">{workflow.id} <span className="text-blue-500 text-xs bg-blue-50 px-1.5 py-0.5 rounded ml-1">v1.2.0</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase">Triggered By</div>
              <div className="font-medium text-slate-900">System Event</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase">Total Duration</div>
              <div className="font-medium text-slate-900">{(workflow.nodes.length * 12.4).toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* Node Execution Trace */}
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {workflow.nodes.map((node, idx) => {
            const nodeStart = new Date(startTime.getTime() + idx * 12400);
            const nodeEnd = new Date(nodeStart.getTime() + 12000);
            const isAgent = node.type === 'agent';
            
            return (
              <motion.div 
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-green-100 text-green-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-800">{node.id}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase font-semibold tracking-wider">{node.type}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded border border-slate-100 p-3 text-xs font-mono text-slate-600 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-green-600">✓ Status: SUCCESS</span>
                      <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> 12.0s</span>
                    </div>
                    {isAgent && (
                      <div className="text-blue-600">
                        ℹ Confidence: {(0.85 + Math.random() * 0.14).toFixed(2)}
                      </div>
                    )}
                    <div className="text-slate-500 border-t border-slate-200 pt-1 mt-1">
                      {'>'} {node.purpose || `Executed ${node.type} task`}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1 text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                      <Database className="w-3 h-3" /> in: ref_{Math.random().toString(36).substring(2, 6)}
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                      <FileText className="w-3 h-3" /> out: ref_{Math.random().toString(36).substring(2, 6)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
}
