import React, { useState, useMemo } from 'react';
import { OsopWorkflow } from '../types/osop';
import { runStore } from '../lib/execution/store';
import { WorkflowRunRecord, NodeRunRecord, WorkflowStats } from '../lib/execution/types';
import { CheckCircle2, XCircle, Clock, SkipForward, ChevronDown, ChevronRight, Trash2, Download, ScrollText } from 'lucide-react';

interface LedgerViewProps {
  workflow: OsopWorkflow;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  FAILED: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  SKIPPED: <SkipForward className="w-3.5 h-3.5 text-slate-400" />,
  TIMED_OUT: <Clock className="w-3.5 h-3.5 text-orange-500" />,
  RUNNING: <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />,
  PENDING: <Clock className="w-3.5 h-3.5 text-slate-300" />,
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 border-emerald-200',
  FAILED: 'bg-red-50 border-red-200',
  SKIPPED: 'bg-slate-50 border-slate-200',
  TIMED_OUT: 'bg-orange-50 border-orange-200',
  RUNNING: 'bg-blue-50 border-blue-200',
  PENDING: 'bg-slate-50 border-slate-200',
};

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

function NodeTraceCard({ record }: { record: NodeRunRecord; key?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-lg mb-1 ${STATUS_BG[record.status] || 'bg-slate-50 border-slate-200'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-xs">
        {STATUS_ICON[record.status]}
        <span className="font-mono font-bold">{record.node_id}</span>
        <span className="text-[10px] uppercase bg-white/50 px-1.5 py-0.5 rounded">{record.node_type}</span>
        <span className="flex-1" />
        {record.duration_ms != null && <span className="text-[10px] font-mono">{fmt(record.duration_ms)}</span>}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="px-3 pb-2 text-[11px] space-y-1 border-t border-black/5">
          <div className="flex gap-4 mt-1 text-slate-600">
            <span>Attempt: {record.attempt}</span>
            <span>Start: {fmtTime(record.started_at)}</span>
            {record.ended_at && <span>End: {fmtTime(record.ended_at)}</span>}
          </div>
          {record.action_ref && (
            <div className="font-mono bg-white/40 rounded px-2 py-1 text-slate-700">
              Action: {record.action_ref.type}{record.action_ref.tool_name ? ` / ${record.action_ref.tool_name}` : ''}{record.action_ref.endpoint ? ` / ${record.action_ref.endpoint}` : ''}
            </div>
          )}
          {record.inputs_snapshot && Object.keys(record.inputs_snapshot).length > 0 && (
            <details><summary className="cursor-pointer font-semibold text-slate-600">Inputs</summary>
              <pre className="bg-white/40 rounded px-2 py-1 overflow-x-auto text-[10px]">{JSON.stringify(record.inputs_snapshot, null, 2)}</pre>
            </details>
          )}
          {record.outputs_snapshot && (
            <details><summary className="cursor-pointer font-semibold text-slate-600">Outputs</summary>
              <pre className="bg-white/40 rounded px-2 py-1 overflow-x-auto text-[10px]">{JSON.stringify(record.outputs_snapshot, null, 2)}</pre>
            </details>
          )}
          {record.error && <div className="bg-red-100 text-red-800 rounded px-2 py-1">Error [{record.error.code}]: {record.error.message}</div>}
          {record.ai_metadata && (
            <div className="bg-violet-50 text-violet-800 rounded px-2 py-1">
              Model: {record.ai_metadata.model} | Tokens: {record.ai_metadata.prompt_tokens}+{record.ai_metadata.completion_tokens} | Confidence: {record.ai_metadata.confidence}
            </div>
          )}
          {record.human_metadata && (
            <div className="bg-blue-50 text-blue-800 rounded px-2 py-1">
              Actor: {record.human_metadata.actor} | Decision: {record.human_metadata.decision}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LedgerView({ workflow }: LedgerViewProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const runs = useMemo(() => runStore.getRuns(workflow.id), [workflow.id]);
  const stats = useMemo(() => runStore.getStats(workflow.id), [workflow.id]);
  const selectedRun = useMemo(() => runs.find(r => r.run_id === selectedRunId) ?? runs[0] ?? null, [runs, selectedRunId]);

  const handleClear = () => {
    if (confirm('Clear all run history?')) {
      runStore.clearRuns(workflow.id);
      window.location.reload();
    }
  };

  const handleExport = () => {
    const blob = new Blob([runStore.exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osop-records-${workflow.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <ScrollText className="w-12 h-12 text-slate-300" />
        <p className="text-sm">No execution records yet.</p>
        <p className="text-xs">Click <b>Run</b> to simulate the workflow.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Run List Sidebar */}
      <div className="w-60 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
        <div className="p-2 border-b border-slate-200 flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-700 flex-1">Runs ({runs.length})</span>
          <button onClick={handleExport} className="p-1 hover:bg-slate-200 rounded" title="Export"><Download className="w-3.5 h-3.5 text-slate-500" /></button>
          <button onClick={handleClear} className="p-1 hover:bg-red-100 rounded" title="Clear"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {runs.map(run => (
            <button
              key={run.run_id}
              onClick={() => setSelectedRunId(run.run_id)}
              className={"w-full text-left px-3 py-2 border-b border-slate-100 text-xs transition-colors " +
                (selectedRun?.run_id === run.run_id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-100")}
            >
              <div className="flex items-center gap-1.5">
                {STATUS_ICON[run.status]}
                <span className="font-mono text-[10px] text-slate-500">{run.run_id.slice(0, 8)}</span>
                <span className="text-[10px] text-slate-400">{run.mode}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {fmt(run.duration_ms || 0)} | {fmtDate(run.started_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Run Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Bar */}
        {stats.total_runs > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <span>Runs: <b>{stats.total_runs}</b></span>
            <span className="text-emerald-600">Pass: <b>{stats.success_count}</b></span>
            <span className="text-red-600">Fail: <b>{stats.failure_count}</b></span>
            <span>Rate: <b>{(stats.success_rate * 100).toFixed(0)}%</b></span>
            <span>Avg: <b>{fmt(stats.avg_duration_ms)}</b></span>
          </div>
        )}
        {selectedRun ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              {STATUS_ICON[selectedRun.status]}
              <div>
                <div className="font-bold text-sm text-slate-800">Run {selectedRun.run_id.slice(0, 8)}</div>
                <div className="text-xs text-slate-500">
                  {selectedRun.mode} | v{selectedRun.workflow_version} | {fmtDate(selectedRun.started_at)}
                  {selectedRun.duration_ms != null && ` | ${fmt(selectedRun.duration_ms)}`}
                </div>
              </div>
            </div>
            {selectedRun.result_summary && (
              <div className={`text-xs rounded-lg px-3 py-2 mb-4 ${selectedRun.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {selectedRun.result_summary}
              </div>
            )}
            <div className="text-xs font-semibold text-slate-600 mb-2">
              Node Timeline ({selectedRun.node_records.length} nodes)
            </div>
            {selectedRun.node_records.map((nr, i) => (
              <NodeTraceCard key={`${nr.node_id}-${i}`} record={nr} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Select a run</div>
        )}
      </div>
    </div>
  );
}
