/**
 * OSOP HTML Report Generator v2
 * Zero icons, zero JS, 5-color system, <15KB output.
 * Uses native <details>/<summary> for expand/collapse.
 * Dark mode via CSS prefers-color-scheme.
 */
import yaml from 'js-yaml';

// --- Types ---

interface Osop {
  osop_version?: string; id?: string; name?: string; description?: string;
  version?: string; owner?: string; tags?: string[];
  nodes?: Array<{ id: string; type: string; subtype?: string; name: string; description?: string; inputs?: any; outputs?: any; runtime?: any; parent?: string; spawn_policy?: any }>;
  edges?: Array<{ from: string; to: string; mode?: string; when?: string; label?: string }>;
  timeout?: string;
}

interface LogRecord {
  node_id: string; node_type: string; attempt: number; status: string;
  started_at?: string; ended_at?: string; duration_ms?: number;
  inputs?: any; outputs?: any;
  error?: { code: string; message: string; details?: string };
  ai_metadata?: { model?: string; provider?: string; prompt_tokens?: number; completion_tokens?: number; cost_usd?: number; confidence?: number };
  human_metadata?: { actor?: string; decision?: string; notes?: string };
  tools_used?: Array<{ tool: string; calls: number; details?: Array<Record<string, any>>; side_effects?: string[]; idempotent?: boolean }>;
  parent_id?: string;
  spawn_index?: number;
  isolation?: string;
  reasoning?: { question?: string; alternatives?: Array<{ id: string; description: string; pros?: string[]; cons?: string[] }>; selected?: string; rationale?: string; confidence?: number };
}

interface OsopLog {
  run_id?: string; workflow_id?: string; workflow_version?: string;
  mode?: string; status?: string;
  trigger?: { type?: string; actor?: string; timestamp?: string };
  started_at?: string; ended_at?: string; duration_ms?: number;
  runtime?: { agent?: string; model?: string };
  node_records?: LogRecord[];
  result_summary?: string;
  cost?: { total_usd?: number; breakdown?: Array<{ node_id: string; cost_usd: number }> };
}

export interface ReportOptions { theme?: 'light' | 'dark'; title?: string }

// --- 5-color system ---

const TYPE_COLOR: Record<string, string> = {
  human: '#ea580c', agent: '#7c3aed',
  api: '#2563eb', mcp: '#2563eb', cli: '#2563eb',
  git: '#475569', docker: '#475569', cicd: '#475569', system: '#475569', infra: '#475569', gateway: '#475569',
  db: '#059669', data: '#059669',
  company: '#ea580c', department: '#ea580c', event: '#475569',
};

function typeColor(t: string): string { return TYPE_COLOR[t] || '#475569'; }

// --- Helpers ---

function h(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function ms(v?: number): string {
  if (v == null) return '-';
  if (v < 1000) return v + 'ms';
  if (v < 60000) return (v / 1000).toFixed(1) + 's';
  return (v / 60000).toFixed(1) + 'm';
}

function usd(v?: number): string {
  if (!v) return '$0';
  return v < 0.01 ? '$' + v.toFixed(4) : '$' + v.toFixed(3);
}

function kvTable(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  const entries = Object.entries(obj);
  if (entries.length === 0) return '';
  let t = '<table>';
  for (const [k, v] of entries) {
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    const display = val.length > 100 ? val.slice(0, 97) + '...' : val;
    t += `<tr><td>${h(k)}</td><td>${h(display)}</td></tr>`;
  }
  return t + '</table>';
}

// --- CSS (minified inline) ---

const CSS = `*{margin:0;padding:0;box-sizing:border-box}
:root{--ok:#16a34a;--err:#dc2626;--warn:#d97706;--bg:#fff;--fg:#1e293b;--mu:#64748b;--bd:#e2e8f0;--cd:#f8fafc}
body{font:14px/1.6 system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:800px;margin:0 auto;padding:16px}
h1{font-size:1.4rem;font-weight:700}
.st{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0}.st span{font-weight:600}
.s{padding:2px 8px;border-radius:3px;color:#fff;font-size:12px}.s.ok{background:var(--ok)}.s.err{background:var(--err)}
.desc{color:var(--mu);font-size:13px;margin:4px 0}
.meta{font:11px monospace;color:var(--mu);margin:4px 0}
.eb{background:#fef2f2;border:1px solid #fecaca;color:var(--err);padding:8px 12px;border-radius:6px;margin:12px 0;font-size:13px}
.n{border:1px solid var(--bd);border-radius:6px;margin:8px 0;overflow:hidden}
.n.child{margin-left:24px;border-style:dashed}
.n.coordinator{border-width:2px}
.n summary{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;background:var(--cd);font-size:13px;list-style:none}
.n summary::-webkit-details-marker{display:none}
.n.er{border-left:3px solid var(--err)}
.tp{color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.du{margin-left:auto;color:var(--mu);font-size:12px;font-family:monospace}
.br{height:4px;border-radius:2px;display:inline-block;min-width:2px}
.bd{padding:12px;font-size:13px;border-top:1px solid var(--bd)}
.bd p{color:var(--mu);margin-bottom:8px}
.bd table{width:100%;font-size:12px;border-collapse:collapse}
.bd td{padding:3px 8px;border-bottom:1px solid var(--bd);vertical-align:top}
.bd td:first-child{font-weight:600;color:var(--mu);width:30%;font-family:monospace;font-size:11px}
.ai{font-size:12px;color:#7c3aed;margin-top:8px;font-family:monospace}
.er-box{background:#fef2f2;color:var(--err);padding:8px;border-radius:4px;font-size:12px;margin-top:8px}
.rt{font-size:12px;color:var(--ok);margin-top:4px}
footer{text-align:center;padding:20px 0;color:var(--mu);font-size:11px}
footer a{color:#2563eb}`;

// --- Main ---

export function generateHtmlReport(osopYaml: string, osoplogYaml?: string, opts?: ReportOptions): string {
  const o = (yaml.load(osopYaml) as Osop) || {};
  const log: OsopLog | null = osoplogYaml ? (yaml.load(osoplogYaml) as OsopLog) || null : null;
  const isExec = !!log;
  const title = opts?.title || o.name || o.id || 'OSOP Report';

  // Build latest record per node
  const latest = new Map<string, LogRecord>();
  const failures: LogRecord[] = [];
  if (log?.node_records) {
    for (const r of log.node_records) {
      const prev = latest.get(r.node_id);
      if (!prev || r.attempt > prev.attempt) latest.set(r.node_id, r);
      if (r.status === 'FAILED') failures.push(r);
    }
  }

  const totalMs = log?.duration_ms;
  let body = '';

  // Header
  body += '<header>';
  body += `<h1>${h(title)}</h1>`;
  body += '<div class="st">';
  if (isExec && log) {
    const sc = log.status === 'COMPLETED' ? 'ok' : 'err';
    body += `<span class="s ${sc}">${h(log.status || 'UNKNOWN')}</span>`;
    body += `<span>${ms(log.duration_ms)}</span>`;
    if (log.cost?.total_usd) body += `<span>${usd(log.cost.total_usd)}</span>`;
    body += `<span>${latest.size} nodes</span>`;
  } else {
    body += `<span>${o.nodes?.length || 0} nodes</span>`;
    body += `<span>${o.edges?.length || 0} edges</span>`;
    if (o.version) body += `<span>v${h(o.version)}</span>`;
  }
  body += '</div>';
  if (o.description) body += `<p class="desc">${h(o.description)}</p>`;

  // Meta line
  const meta: string[] = [];
  if (o.id) meta.push(o.id);
  if (log?.run_id) meta.push('run:' + log.run_id.slice(0, 8));
  if (log?.mode) meta.push(log.mode);
  if (log?.runtime?.agent) meta.push(log.runtime.agent);
  if (log?.trigger?.actor) meta.push(log.trigger.actor);
  if (log?.started_at) meta.push(log.started_at.replace('T', ' ').replace('Z', ''));
  if (meta.length) body += `<div class="meta">${meta.map(h).join(' · ')}</div>`;
  body += '</header>';

  // Error banner
  if (failures.length > 0) {
    const retried = failures.filter(f => {
      const l = latest.get(f.node_id);
      return l && l.status === 'COMPLETED' && l.attempt > f.attempt;
    });
    for (const f of failures) {
      const retriedOk = retried.includes(f);
      body += `<div class="eb">${h(f.node_id)} failed: ${h(f.error?.code || '')} — ${h(f.error?.message || 'unknown')}`;
      if (retriedOk) body += ' — retried ok';
      body += '</div>';
    }
  }

  // Nodes — errors first, then by execution order
  body += '<main>';
  const nodes = o.nodes || [];
  const sorted = [...nodes].sort((a, b) => {
    const la = latest.get(a.id);
    const lb = latest.get(b.id);
    const aErr = la?.status === 'FAILED' ? 0 : 1;
    const bErr = lb?.status === 'FAILED' ? 0 : 1;
    if (aErr !== bErr) return aErr - bErr;
    return 0; // preserve original order otherwise
  });

  for (const node of sorted) {
    const rec = latest.get(node.id);
    const allRecs = log?.node_records?.filter(r => r.node_id === node.id) || [];
    const isFailed = rec?.status === 'FAILED';
    const hasRetry = allRecs.length > 1;
    const isChild = !!(node as any).parent;
    const isCoordinator = node.subtype === 'coordinator';
    let cls = isFailed ? 'n er' : 'n';
    if (isChild) cls += ' child';
    if (isCoordinator) cls += ' coordinator';
    const open = isFailed ? ' open' : '';

    body += `<details class="${cls}"${open}>`;
    body += '<summary>';
    body += `<span class="tp" style="background:${typeColor(node.type)}">${h(node.type.toUpperCase())}</span>`;
    body += `<strong>${h(node.name)}</strong>`;
    if (rec) {
      body += `<span class="du">${ms(rec.duration_ms)}</span>`;
      if (rec.status === 'COMPLETED') {
        const pct = totalMs ? Math.max(1, Math.round((rec.duration_ms || 0) / totalMs * 100)) : 0;
        body += `<span class="br" style="width:${pct}%;background:var(--ok)"></span>`;
      } else if (rec.status === 'FAILED') {
        body += '<span class="s err">FAILED</span>';
      } else {
        body += `<span class="s ok">${h(rec.status)}</span>`;
      }
    }
    body += '</summary>';

    body += '<div class="bd">';
    if (node.description) body += `<p>${h(node.description)}</p>`;

    // Inputs/Outputs
    const inputs = rec?.inputs || node.inputs;
    const outputs = rec?.outputs || node.outputs;
    if (inputs) body += kvTable(inputs);
    if (outputs) body += kvTable(outputs);

    // AI metadata
    if (rec?.ai_metadata) {
      const ai = rec.ai_metadata;
      const parts: string[] = [];
      if (ai.model) parts.push(ai.model);
      if (ai.prompt_tokens != null) parts.push(`${ai.prompt_tokens.toLocaleString()}→${(ai.completion_tokens || 0).toLocaleString()} tok`);
      if (ai.cost_usd) parts.push(usd(ai.cost_usd));
      if (ai.confidence != null) parts.push(`${(ai.confidence * 100).toFixed(0)}%`);
      if (parts.length) body += `<div class="ai">${parts.map(h).join(' · ')}</div>`;
    }

    // Human metadata
    if (rec?.human_metadata) {
      const hm = rec.human_metadata;
      const parts: string[] = [];
      if (hm.actor) parts.push(hm.actor);
      if (hm.decision) parts.push('decision=' + hm.decision);
      if (hm.notes) parts.push(hm.notes);
      if (parts.length) body += `<div style="font-size:12px;color:var(--mu);margin-top:4px">${parts.map(h).join(' · ')}</div>`;
    }

    // Parent info
    if (rec?.parent_id) {
      body += `<div style="font-size:11px;color:var(--mu);margin-top:4px;font-family:monospace">spawned by ${h(rec.parent_id)}${rec.spawn_index ? ' (#' + rec.spawn_index + ')' : ''}${rec.isolation ? ' · ' + rec.isolation : ''}</div>`;
    }

    // Tools used
    if (rec?.tools_used?.length) {
      body += `<div style="font-size:12px;color:var(--mu);margin-top:4px">`;
      for (const t of rec.tools_used) {
        body += `<span style="margin-right:8px">${h(t.tool)} x${t.calls}</span>`;
      }
      body += '</div>';
      // Tool details (expandable)
      for (const t of rec.tools_used) {
        if (t.details?.length) {
          body += `<details style="margin-top:4px"><summary style="font-size:11px;color:var(--mu);cursor:pointer">${h(t.tool)} details</summary>`;
          body += '<div style="font-size:11px;padding:4px 0">';
          for (const d of t.details) {
            const parts = Object.entries(d).map(([k, v]) => `${h(k)}=${h(String(v))}`);
            body += `<div style="color:var(--mu);font-family:monospace;padding:1px 0">${parts.join(' · ')}</div>`;
          }
          body += '</div></details>';
        }
      }
    }

    // Reasoning block
    if (rec?.reasoning) {
      const r = rec.reasoning;
      body += '<details style="margin-top:8px"><summary style="font-size:12px;color:#7c3aed;cursor:pointer;font-weight:600">Reasoning</summary>';
      body += '<div style="font-size:12px;padding:8px 0">';
      if (r.question) body += `<div style="margin-bottom:6px"><strong>Q:</strong> ${h(r.question)}</div>`;
      if (r.alternatives?.length) {
        body += '<table style="width:100%;font-size:11px;border-collapse:collapse;margin-bottom:6px">';
        body += '<tr><th style="text-align:left;padding:3px 6px;border-bottom:1px solid var(--bd)">Option</th><th style="text-align:left;padding:3px 6px;border-bottom:1px solid var(--bd)">Pros</th><th style="text-align:left;padding:3px 6px;border-bottom:1px solid var(--bd)">Cons</th></tr>';
        for (const alt of r.alternatives) {
          const selected = alt.id === r.selected;
          const style = selected ? 'font-weight:600;background:#f0fdf4' : '';
          body += `<tr style="${style}"><td style="padding:3px 6px;border-bottom:1px solid var(--bd)">${h(alt.id)}${selected ? ' *' : ''}</td>`;
          body += `<td style="padding:3px 6px;border-bottom:1px solid var(--bd);color:var(--ok)">${(alt.pros || []).map(h).join(', ')}</td>`;
          body += `<td style="padding:3px 6px;border-bottom:1px solid var(--bd);color:var(--err)">${(alt.cons || []).map(h).join(', ')}</td></tr>`;
        }
        body += '</table>';
      }
      if (r.rationale) body += `<div style="color:var(--mu)"><strong>Rationale:</strong> ${h(r.rationale)}</div>`;
      if (r.confidence != null) body += `<div style="color:var(--mu)">Confidence: ${(r.confidence * 100).toFixed(0)}%</div>`;
      body += '</div></details>';
    }

    // Error
    if (rec?.error) {
      body += `<div class="er-box">${h(rec.error.code)}: ${h(rec.error.message)}`;
      if (rec.error.details) body += `<br>${h(rec.error.details)}`;
      body += '</div>';
    }

    // Retry history
    if (hasRetry) {
      for (const r of allRecs) {
        if (r === rec) continue;
        body += `<div class="rt">Attempt ${r.attempt}: ${h(r.status)} ${ms(r.duration_ms)}`;
        if (r.error) body += ` — ${h(r.error.code)}`;
        body += '</div>';
      }
    }

    body += '</div></details>';
  }

  body += '</main>';

  // Summary
  if (log?.result_summary) {
    body += `<p style="margin:16px 0;padding:12px;background:var(--cd);border-radius:6px;font-size:13px;color:var(--mu)">${h(log.result_summary)}</p>`;
  }

  body += '<footer>OSOP v1.0 · <a href="https://osop.ai">osop.ai</a></footer>';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
