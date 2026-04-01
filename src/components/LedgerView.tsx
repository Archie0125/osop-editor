import React, { useState, useMemo, useEffect, useRef } from 'react';
import { OsopWorkflow } from '../types/osop';
import { runStore } from '../lib/execution/store';
import { WorkflowRunRecord, NodeRunRecord, WorkflowStats } from '../lib/execution/types';
import { CheckCircle2, XCircle, Clock, SkipForward, ChevronDown, ChevronRight, Trash2, Download, ScrollText, Play, Pause, SkipBack, StepForward, TreePine, List, Wrench, Brain } from 'lucide-react';

interface LedgerViewProps {
  workflow: OsopWorkflow;
  importedRun?: WorkflowRunRecord | null;
  onStepChange?: (stepIndex: number, nodeId: string | null) => void;
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

// --- Node Trace Card with enhanced fields ---

function NodeTraceCard({ record, isActive, indent }: { record: NodeRunRecord; key?: string; isActive?: boolean; indent?: number }) {
  const [open, setOpen] = useState(false);
  const indentPx = (indent || 0) * 20;

  return (
    <div
      className={`border rounded-lg mb-1 transition-all ${STATUS_BG[record.status] || 'bg-slate-50 border-slate-200'} ${isActive ? 'ring-2 ring-blue-400 shadow-md' : ''}`}
      style={indentPx > 0 ? { marginLeft: indentPx } : undefined}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-xs">
        {STATUS_ICON[record.status]}
        <span className="font-mono font-bold">{record.node_id}</span>
        <span className="text-[10px] uppercase bg-white/50 px-1.5 py-0.5 rounded">{record.node_type}</span>
        {record.parent_id && (
          <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
            child #{record.spawn_index || '?'} of {record.parent_id}
          </span>
        )}
        <span className="flex-1" />
        {record.tools_used && record.tools_used.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-indigo-600">
            <Wrench className="w-3 h-3" />{record.tools_used.reduce((s, t) => s + t.calls, 0)}
          </span>
        )}
        {record.duration_ms != null && <span className="text-[10px] font-mono">{fmt(record.duration_ms)}</span>}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="px-3 pb-2 text-[11px] space-y-1 border-t border-black/5">
          <div className="flex gap-4 mt-1 text-slate-600">
            <span>Attempt: {record.attempt}</span>
            <span>Start: {fmtTime(record.started_at)}</span>
            {record.ended_at && <span>End: {fmtTime(record.ended_at)}</span>}
            {record.isolation && <span>Isolation: {record.isolation}</span>}
          </div>
          {record.action_ref && (
            <div className="font-mono bg-white/40 rounded px-2 py-1 text-slate-700">
              Action: {record.action_ref.type}{record.action_ref.tool_name ? ` / ${record.action_ref.tool_name}` : ''}{record.action_ref.endpoint ? ` / ${record.action_ref.endpoint}` : ''}{record.action_ref.command ? ` / ${record.action_ref.command}` : ''}
            </div>
          )}

          {/* Tools Used (OSP-0002) */}
          {record.tools_used && record.tools_used.length > 0 && (
            <details><summary className="cursor-pointer font-semibold text-indigo-600 flex items-center gap-1"><Wrench className="w-3 h-3" /> Tools Used ({record.tools_used.length})</summary>
              <div className="mt-1 space-y-1">
                {record.tools_used.map((t, i) => (
                  <div key={i} className="bg-indigo-50 rounded px-2 py-1 flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700">{t.tool}</span>
                    <span className="text-indigo-500">{t.calls} calls</span>
                    {t.details && t.details.length > 0 && (
                      <details className="ml-2"><summary className="cursor-pointer text-indigo-400">details</summary>
                        <pre className="text-[10px] mt-1 overflow-x-auto">{JSON.stringify(t.details, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Reasoning (OSP-0002) */}
          {record.reasoning && (
            <details><summary className="cursor-pointer font-semibold text-amber-600 flex items-center gap-1"><Brain className="w-3 h-3" /> Reasoning</summary>
              <div className="mt-1 bg-amber-50 rounded px-2 py-1.5 space-y-1">
                {record.reasoning.question && <div><b>Question:</b> {record.reasoning.question}</div>}
                {record.reasoning.alternatives && (
                  <div>
                    <b>Alternatives:</b>
                    {record.reasoning.alternatives.map((a, i) => (
                      <div key={i} className={`ml-2 ${a.id === record.reasoning?.selected ? 'font-bold text-amber-800' : 'text-amber-600'}`}>
                        {a.id === record.reasoning?.selected ? '> ' : '  '}{a.id}: {a.description}
                      </div>
                    ))}
                  </div>
                )}
                {record.reasoning.selected && <div><b>Selected:</b> {record.reasoning.selected}</div>}
                {record.reasoning.confidence != null && <div><b>Confidence:</b> {(record.reasoning.confidence * 100).toFixed(0)}%</div>}
              </div>
            </details>
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
              Model: {record.ai_metadata.model} | Tokens: {record.ai_metadata.prompt_tokens}+{record.ai_metadata.completion_tokens}{record.ai_metadata.confidence != null ? ` | Confidence: ${record.ai_metadata.confidence}` : ''}
            </div>
          )}
          {record.human_metadata && (
            <div className="bg-blue-50 text-blue-800 rounded px-2 py-1">
              Actor: {record.human_metadata.actor} | Decision: {record.human_metadata.decision}{record.human_metadata.notes ? ` | ${record.human_metadata.notes}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Playback Controls ---

function PlaybackControls({ total, current, onStep, playing, onTogglePlay, speed, onSpeedChange }: {
  total: number; current: number; onStep: (i: number) => void;
  playing: boolean; onTogglePlay: () => void;
  speed: number; onSpeedChange: (s: number) => void;
}) {
  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200">
      <button onClick={() => onStep(0)} className="p-1 hover:bg-blue-100 rounded" title="Reset">
        <SkipBack className="w-4 h-4 text-blue-600" />
      </button>
      <button onClick={onTogglePlay} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white" title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <button onClick={() => onStep(Math.min(current + 1, total - 1))} className="p-1 hover:bg-blue-100 rounded" title="Step Forward">
        <StepForward className="w-4 h-4 text-blue-600" />
      </button>

      {/* Timeline scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(total - 1, 0)}
        value={current}
        onChange={e => onStep(parseInt(e.target.value))}
        className="flex-1 h-1.5 accent-blue-600"
      />
      <span className="text-xs font-mono text-blue-700 w-16 text-right">{current + 1}/{total}</span>

      {/* Speed */}
      <div className="flex items-center gap-0.5 ml-2">
        {speeds.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${speed === s ? 'bg-blue-600 text-white' : 'text-blue-500 hover:bg-blue-100'}`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Build tree from flat records ---

interface TreeNode {
  record: NodeRunRecord;
  children: TreeNode[];
}

function buildTree(records: NodeRunRecord[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const r of records) {
    const node: TreeNode = { record: r, children: [] };
    map.set(r.node_id, node);
  }

  for (const r of records) {
    const node = map.get(r.node_id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function renderTree(nodes: TreeNode[], activeNodeId: string | null, depth: number = 0): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  for (const node of nodes) {
    result.push(
      <NodeTraceCard
        key={`${node.record.node_id}-${node.record.attempt}-${depth}`}
        record={node.record}
        isActive={node.record.node_id === activeNodeId}
        indent={depth}
      />
    );
    if (node.children.length > 0) {
      result.push(...renderTree(node.children, activeNodeId, depth + 1));
    }
  }
  return result;
}

// --- Main Component ---

export function LedgerView({ workflow, importedRun, onStepChange }: LedgerViewProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [treeMode, setTreeMode] = useState(false);
  const [playbackStep, setPlaybackStep] = useState(-1); // -1 = show all
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const playRef = useRef<ReturnType<typeof setInterval>>();

  const runs = useMemo(() => {
    const stored = runStore.getRuns(workflow.id);
    if (importedRun && !stored.find(r => r.run_id === importedRun.run_id)) {
      return [importedRun, ...stored];
    }
    return stored;
  }, [workflow.id, importedRun]);

  const stats = useMemo(() => runStore.getStats(workflow.id), [workflow.id]);
  const selectedRun = useMemo(() => runs.find(r => r.run_id === selectedRunId) ?? runs[0] ?? null, [runs, selectedRunId]);

  // Auto-select imported run
  useEffect(() => {
    if (importedRun) setSelectedRunId(importedRun.run_id);
  }, [importedRun]);

  // Playback timer
  useEffect(() => {
    if (playing && selectedRun) {
      playRef.current = setInterval(() => {
        setPlaybackStep(prev => {
          const next = prev + 1;
          if (next >= selectedRun.node_records.length) {
            setPlaying(false);
            return selectedRun.node_records.length - 1;
          }
          return next;
        });
      }, 1000 / speed);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, speed, selectedRun]);

  // Notify parent of step changes (for GraphView sync)
  useEffect(() => {
    if (selectedRun && playbackStep >= 0 && playbackStep < selectedRun.node_records.length) {
      onStepChange?.(playbackStep, selectedRun.node_records[playbackStep].node_id);
    } else {
      onStepChange?.(-1, null);
    }
  }, [playbackStep, selectedRun, onStepChange]);

  const handleTogglePlay = () => {
    if (!playing && playbackStep < 0) setPlaybackStep(0);
    setPlaying(!playing);
  };

  const handleStep = (i: number) => {
    setPlaybackStep(i);
    setPlaying(false);
  };

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

  const hasParentChild = selectedRun?.node_records.some(r => r.parent_id);
  const visibleRecords = selectedRun ? (playbackStep >= 0 ? selectedRun.node_records.slice(0, playbackStep + 1) : selectedRun.node_records) : [];
  const activeNodeId = playbackStep >= 0 && selectedRun ? selectedRun.node_records[playbackStep]?.node_id : null;

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <ScrollText className="w-12 h-12 text-slate-300" />
        <p className="text-sm">No execution records yet.</p>
        <p className="text-xs">Open a <b>.osoplog</b> file or simulate a workflow.</p>
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
              onClick={() => { setSelectedRunId(run.run_id); setPlaybackStep(-1); setPlaying(false); }}
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

        {/* Playback Controls */}
        {selectedRun && (
          <PlaybackControls
            total={selectedRun.node_records.length}
            current={playbackStep >= 0 ? playbackStep : selectedRun.node_records.length - 1}
            onStep={handleStep}
            playing={playing}
            onTogglePlay={handleTogglePlay}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        )}

        {selectedRun ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              {STATUS_ICON[selectedRun.status]}
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-800">Run {selectedRun.run_id.slice(0, 8)}</div>
                <div className="text-xs text-slate-500">
                  {selectedRun.mode} | v{selectedRun.workflow_version} | {fmtDate(selectedRun.started_at)}
                  {selectedRun.duration_ms != null && ` | ${fmt(selectedRun.duration_ms)}`}
                </div>
              </div>
              {/* Tree/Flat toggle */}
              {hasParentChild && (
                <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                  <button onClick={() => setTreeMode(false)} className={`p-1.5 rounded-l ${!treeMode ? 'bg-white shadow-sm' : ''}`} title="Flat"><List className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTreeMode(true)} className={`p-1.5 rounded-r ${treeMode ? 'bg-white shadow-sm' : ''}`} title="Tree"><TreePine className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {selectedRun.result_summary && (
              <div className={`text-xs rounded-lg px-3 py-2 mb-4 ${selectedRun.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {selectedRun.result_summary}
              </div>
            )}

            <div className="text-xs font-semibold text-slate-600 mb-2">
              Node Timeline ({visibleRecords.length}{playbackStep >= 0 ? `/${selectedRun.node_records.length}` : ''} nodes)
            </div>

            {treeMode && hasParentChild ? (
              renderTree(buildTree(visibleRecords), activeNodeId)
            ) : (
              visibleRecords.map((nr, i) => (
                <NodeTraceCard
                  key={`${nr.node_id}-${i}`}
                  record={nr}
                  isActive={nr.node_id === activeNodeId}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Select a run</div>
        )}
      </div>
    </div>
  );
}
