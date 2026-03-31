import { WorkflowRunRecord, WorkflowStats, IterationRecord } from './types';

const RUNS_PREFIX = 'osop:runs:';
const ITER_PREFIX = 'osop:iterations:';

export class RunStore {
  // --- Runs ---

  saveRun(record: WorkflowRunRecord): void {
    const key = RUNS_PREFIX + record.workflow_id;
    const runs = this.getRuns(record.workflow_id);
    runs.push(record);
    localStorage.setItem(key, JSON.stringify(runs));
  }

  updateRun(record: WorkflowRunRecord): void {
    const key = RUNS_PREFIX + record.workflow_id;
    const runs = this.getRuns(record.workflow_id);
    const idx = runs.findIndex(r => r.run_id === record.run_id);
    if (idx >= 0) {
      runs[idx] = record;
    } else {
      runs.push(record);
    }
    localStorage.setItem(key, JSON.stringify(runs));
  }

  getRuns(workflowId: string, opts?: { limit?: number; status?: string }): WorkflowRunRecord[] {
    const key = RUNS_PREFIX + workflowId;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    let runs: WorkflowRunRecord[] = JSON.parse(raw);
    if (opts?.status) {
      runs = runs.filter(r => r.status === opts.status);
    }
    runs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    if (opts?.limit) {
      runs = runs.slice(0, opts.limit);
    }
    return runs;
  }

  getRun(runId: string, workflowId: string): WorkflowRunRecord | null {
    const runs = this.getRuns(workflowId);
    return runs.find(r => r.run_id === runId) ?? null;
  }

  getStats(workflowId: string): WorkflowStats {
    const runs = this.getRuns(workflowId);
    const completed = runs.filter(r => r.status === 'COMPLETED' || r.status === 'FAILED');
    const successCount = completed.filter(r => r.status === 'COMPLETED').length;
    const failureCount = completed.filter(r => r.status === 'FAILED').length;

    const durations = completed.filter(r => r.duration_ms != null).map(r => r.duration_ms!);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Per-node stats
    const nodeStats: WorkflowStats['node_stats'] = {};
    for (const run of completed) {
      for (const nr of run.node_records) {
        if (!nodeStats[nr.node_id]) {
          nodeStats[nr.node_id] = { avg_duration_ms: 0, failure_rate: 0, timeout_rate: 0, common_errors: [] };
        }
        const ns = nodeStats[nr.node_id];
        // We'll compute averages below
        (ns as any)._durations = (ns as any)._durations || [];
        (ns as any)._total = ((ns as any)._total || 0) + 1;
        if (nr.duration_ms != null) (ns as any)._durations.push(nr.duration_ms);
        if (nr.status === 'FAILED') {
          (ns as any)._failures = ((ns as any)._failures || 0) + 1;
          if (nr.error?.message && !ns.common_errors.includes(nr.error.message)) {
            ns.common_errors.push(nr.error.message);
          }
        }
        if (nr.status === 'TIMED_OUT') {
          (ns as any)._timeouts = ((ns as any)._timeouts || 0) + 1;
        }
      }
    }
    for (const [, ns] of Object.entries(nodeStats)) {
      const d = (ns as any)._durations || [];
      ns.avg_duration_ms = d.length > 0 ? Math.round(d.reduce((a: number, b: number) => a + b, 0) / d.length) : 0;
      ns.failure_rate = (ns as any)._total > 0 ? ((ns as any)._failures || 0) / (ns as any)._total : 0;
      ns.timeout_rate = (ns as any)._total > 0 ? ((ns as any)._timeouts || 0) / (ns as any)._total : 0;
      ns.common_errors = ns.common_errors.slice(0, 5);
      delete (ns as any)._durations;
      delete (ns as any)._total;
      delete (ns as any)._failures;
      delete (ns as any)._timeouts;
    }

    return {
      total_runs: completed.length,
      success_count: successCount,
      failure_count: failureCount,
      success_rate: completed.length > 0 ? successCount / completed.length : 0,
      avg_duration_ms: avgDuration,
      node_stats: nodeStats,
    };
  }

  clearRuns(workflowId: string): void {
    localStorage.removeItem(RUNS_PREFIX + workflowId);
  }

  // --- Iterations ---

  saveIteration(record: IterationRecord): void {
    const key = ITER_PREFIX + record.workflow_id;
    const iters = this.getIterations(record.workflow_id);
    iters.push(record);
    localStorage.setItem(key, JSON.stringify(iters));
  }

  getIterations(workflowId: string): IterationRecord[] {
    const raw = localStorage.getItem(ITER_PREFIX + workflowId);
    return raw ? JSON.parse(raw) : [];
  }

  // --- Export/Import ---

  exportAll(): string {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('osop:')) {
        data[key] = JSON.parse(localStorage.getItem(key)!);
      }
    }
    return JSON.stringify(data, null, 2);
  }

  importRecords(json: string): void {
    const data = JSON.parse(json);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('osop:')) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  }
}

// Singleton
export const runStore = new RunStore();
