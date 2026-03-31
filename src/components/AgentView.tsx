import React, { useMemo, useState } from 'react';
import { OsopWorkflow } from '../types/osop';
import { generateAgentSOP } from '../lib/execution/sop-generator';
import { runStore } from '../lib/execution/store';
import { Copy, Check, History, FileCode } from 'lucide-react';

interface AgentViewProps {
  workflow: OsopWorkflow;
}

export function AgentView({ workflow }: AgentViewProps) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const stats = useMemo(() => runStore.getStats(workflow.id), [workflow.id]);
  const runs = useMemo(() => runStore.getRuns(workflow.id, { limit: 10 }), [workflow.id]);
  const sopYaml = useMemo(() => generateAgentSOP(workflow, stats, runs), [workflow, stats, runs]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sopYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main SOP Panel */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-300 font-semibold flex-1">Agent SOP — Machine-Executable Format</span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showHistory ? 'bg-blue-600 text-white' : 'bg-[#3c3c3c] text-slate-300 hover:bg-[#4c4c4c]'
            }`}
          >
            <History className="w-3 h-3" />
            History ({stats.total_runs})
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 bg-[#3c3c3c] text-slate-300 hover:bg-[#4c4c4c] rounded text-xs transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy SOP'}
          </button>
        </div>

        {/* SOP Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-[#d4d4d4] font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {sopYaml}
          </pre>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && stats.total_runs > 0 && (
        <div className="w-72 bg-[#252526] border-l border-[#3c3c3c] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#3c3c3c]">
            <div className="text-xs font-semibold text-slate-300">Execution History</div>
          </div>

          {/* Stats Summary */}
          <div className="px-3 py-2 border-b border-[#3c3c3c] text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Runs</span><span className="text-slate-200">{stats.total_runs}</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate</span>
              <span className={stats.success_rate >= 0.8 ? 'text-emerald-400' : stats.success_rate >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                {(stats.success_rate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Duration</span><span className="text-slate-200">{(stats.avg_duration_ms / 1000).toFixed(1)}s</span>
            </div>

            {/* Failure Hotspots */}
            {Object.entries(stats.node_stats).filter(([, ns]) => (ns as any).failure_rate > 0).length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-red-400 mb-1">Failure Hotspots</div>
                {Object.entries(stats.node_stats)
                  .filter(([, ns]) => (ns as any).failure_rate > 0)
                  .sort(([, a], [, b]) => (b as any).failure_rate - (a as any).failure_rate)
                  .slice(0, 5)
                  .map(([nodeId, ns]) => (
                    <div key={nodeId} className="flex justify-between text-[10px]">
                      <span className="font-mono text-slate-300">{nodeId}</span>
                      <span className="text-red-400">{((ns as any).failure_rate * 100).toFixed(0)}%</span>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Slow Steps */}
            {Object.entries(stats.node_stats).filter(([, ns]) => (ns as any).avg_duration_ms > 2000).length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-yellow-400 mb-1">Slow Steps</div>
                {Object.entries(stats.node_stats)
                  .filter(([, ns]) => (ns as any).avg_duration_ms > 2000)
                  .sort(([, a], [, b]) => (b as any).avg_duration_ms - (a as any).avg_duration_ms)
                  .slice(0, 5)
                  .map(([nodeId, ns]) => (
                    <div key={nodeId} className="flex justify-between text-[10px]">
                      <span className="font-mono text-slate-300">{nodeId}</span>
                      <span className="text-yellow-400">{((ns as any).avg_duration_ms / 1000).toFixed(1)}s</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Recent Runs */}
          <div className="flex-1 overflow-y-auto">
            {runs.map(run => (
              <div key={run.run_id} className="px-3 py-2 border-b border-[#3c3c3c] text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${run.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-mono text-slate-300">{run.run_id.slice(0, 8)}</span>
                  <span className="text-slate-500">{run.mode}</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  {run.duration_ms != null && `${(run.duration_ms / 1000).toFixed(1)}s | `}
                  {new Date(run.started_at).toLocaleString()}
                </div>
                {run.error_summary && <div className="text-red-400 mt-0.5 truncate">{run.error_summary}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
