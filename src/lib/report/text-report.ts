/**
 * OSOP Text Report Generator
 * Plain ASCII + ANSI color modes. <2KB output. Zero dependencies beyond js-yaml.
 */
import yaml from 'js-yaml';

interface Osop { id?: string; name?: string; description?: string; nodes?: Array<{ id: string; type: string; name: string; parent?: string }>; edges?: Array<{ from: string; to: string; mode?: string }> }
interface LogRec { node_id: string; node_type: string; attempt: number; status: string; duration_ms?: number; error?: { code: string; message: string }; ai_metadata?: { prompt_tokens?: number; completion_tokens?: number; cost_usd?: number; confidence?: number }; human_metadata?: { decision?: string }; outputs?: any; parent_id?: string; spawn_index?: number }
interface OsopLog { run_id?: string; status?: string; duration_ms?: number; runtime?: { agent?: string }; trigger?: { actor?: string }; started_at?: string; node_records?: LogRec[]; result_summary?: string; cost?: { total_usd?: number } }

// ANSI codes
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[34m', M = '\x1b[35m', O = '\x1b[38;5;208m', D = '\x1b[2m', BO = '\x1b[1m', X = '\x1b[0m';

const TYPE_ANSI: Record<string, string> = {
  human: O, agent: M, api: B, mcp: B, cli: B,
  git: D, docker: D, cicd: D, system: D, infra: D, gateway: D,
  db: G, data: G, company: O, event: D,
};

function ms(v?: number): string {
  if (v == null) return '-';
  if (v < 1000) return v + 'ms';
  if (v < 60000) return (v / 1000).toFixed(1) + 's';
  return (v / 60000).toFixed(1) + 'm';
}

function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
function dots(name: string, max: number): string { return name + ' ' + '.'.repeat(Math.max(2, max - name.length)) + ' '; }

export function generateTextReport(osopYaml: string, osoplogYaml?: string, ansi = false): string {
  const o = (yaml.load(osopYaml) as Osop) || {};
  const log: OsopLog | null = osoplogYaml ? (yaml.load(osoplogYaml) as OsopLog) || null : null;
  const c = (code: string, text: string) => ansi ? code + text + X : text;

  const lines: string[] = [];
  const title = o.name || o.id || 'OSOP Report';
  lines.push(c(BO, `OSOP Report: ${title}`));
  lines.push('='.repeat(Math.min(60, title.length + 14)));

  // Stats line
  if (log) {
    const sc = log.status === 'COMPLETED' ? c(G, 'COMPLETED') : c(R, log.status || 'UNKNOWN');
    const parts = [`Status: ${sc}`, ms(log.duration_ms)];
    if (log.cost?.total_usd) parts.push('$' + log.cost.total_usd.toFixed(3));
    const latest = new Map<string, LogRec>();
    for (const r of log.node_records || []) {
      const prev = latest.get(r.node_id);
      if (!prev || r.attempt > prev.attempt) latest.set(r.node_id, r);
    }
    parts.push(latest.size + ' nodes');
    lines.push(parts.join(' | '));

    const meta: string[] = [];
    if (log.run_id) meta.push('Run: ' + log.run_id.slice(0, 8));
    if (log.runtime?.agent) meta.push('Agent: ' + log.runtime.agent);
    if (log.trigger?.actor) meta.push('Actor: ' + log.trigger.actor);
    if (meta.length) lines.push(c(D, meta.join(' | ')));

    // Errors first
    const failures = (log.node_records || []).filter(r => r.status === 'FAILED');
    if (failures.length) {
      lines.push('');
      for (const f of failures) {
        const l = latest.get(f.node_id);
        const retried = l && l.status === 'COMPLETED' && l.attempt > f.attempt;
        const suffix = retried ? c(G, ' -> retried ok') : '';
        lines.push(c(R, `! ${f.node_id} FAILED (attempt ${f.attempt})`) + ` -> ${f.error?.code || ''}: ${f.error?.message || ''}${suffix}`);
      }
    }

    // Node list
    lines.push('');
    const maxName = Math.max(...[...(o.nodes || [])].map(n => n.id.length), 10);
    const dotLen = maxName + 4;

    for (const node of o.nodes || []) {
      const rec = latest.get(node.id);
      if (!rec) continue;
      const tc = TYPE_ANSI[node.type] || D;
      const typeStr = pad(node.type.toUpperCase(), 7);
      const nameStr = dots(node.id, dotLen);
      const durStr = pad(ms(rec.duration_ms), 7);

      let status = rec.status === 'COMPLETED' ? c(G, 'ok') : c(R, rec.status);
      const extras: string[] = [];

      if ((log.node_records || []).filter(r => r.node_id === node.id).length > 1) extras.push('(retry)');
      if (rec.ai_metadata) {
        const ai = rec.ai_metadata;
        if (ai.prompt_tokens != null) extras.push(`${ai.prompt_tokens.toLocaleString()}->${(ai.completion_tokens || 0).toLocaleString()} tok`);
        if (ai.cost_usd) extras.push('$' + ai.cost_usd.toFixed(3));
        if (ai.confidence != null) extras.push((ai.confidence * 100).toFixed(0) + '%');
      }
      if (rec.human_metadata?.decision) extras.push('decision=' + rec.human_metadata.decision);
      if (rec.parent_id) extras.push('spawned by ' + rec.parent_id);

      const indent = node.parent ? '    ' : '  ';
      const line = `${indent}${c(tc, typeStr)} ${nameStr}${durStr} ${status}${extras.length ? '  ' + c(D, extras.join('  ')) : ''}`;
      lines.push(line);
    }

    // Summary
    if (log.result_summary) {
      lines.push('');
      lines.push(c(D, 'Summary: ' + log.result_summary));
    }
  } else {
    // Spec mode
    lines.push(`${o.nodes?.length || 0} nodes, ${o.edges?.length || 0} edges`);
    lines.push('');
    for (const node of o.nodes || []) {
      const tc = TYPE_ANSI[node.type] || D;
      lines.push(`  ${c(tc, pad(node.type.toUpperCase(), 7))} ${node.name}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
