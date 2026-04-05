/**
 * Render a .sop collection file into a standalone SOP Doc HTML.
 *
 * Usage: npx tsx scripts/render-sop.ts <file.sop> [-o output.html]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import yaml from "js-yaml";

function parseYaml(text: string): any {
  return yaml.load(text) || {};
}

function parseOsopNodes(yaml: string) {
  const nodes: { id: string; type: string; name: string; description?: string }[] = [];
  const edges: { from: string; to: string; mode: string }[] = [];

  const nodeRegex = /- id: "([^"]+)"\s*\n\s*type: "([^"]+)"(?:\s*\n\s*subtype: "[^"]*")?(?:\s*\n\s*name: "([^"]*)")?(?:\s*\n\s*description: "([^"]*)")?/g;
  let m;
  while ((m = nodeRegex.exec(yaml)) !== null) {
    nodes.push({ id: m[1], type: m[2], name: m[3] || m[1], description: m[4] });
  }

  const edgeRegex = /- from: "([^"]+)"\s*\n\s*to: "([^"]+)"\s*\n\s*mode: "([^"]+)"/g;
  while ((m = edgeRegex.exec(yaml)) !== null) {
    edges.push({ from: m[1], to: m[2], mode: m[3] });
  }

  return { nodes, edges };
}

const dotColor: Record<string, string> = {
  human: "#3b82f6", agent: "#a855f7", api: "#22c55e",
  cli: "#f59e0b", db: "#06b6d4", system: "#94a3b8",
  cicd: "#f97316", mcp: "#6366f1", git: "#ef4444",
  docker: "#0ea5e9", infra: "#14b8a6", data: "#10b981",
  event: "#f43f5e",
};

const modeColor: Record<string, string> = {
  sequential: "#94a3b8", parallel: "#6366f1", conditional: "#f59e0b",
  fallback: "#ef4444", loop: "#a855f7", spawn: "#22c55e",
  error: "#ef4444", timeout: "#f97316",
};

function renderVisual(yaml: string): string {
  const { nodes, edges } = parseOsopNodes(yaml);
  if (nodes.length === 0) return "";

  let html = '<div class="visual">';
  for (const node of nodes) {
    const color = dotColor[node.type] || "#94a3b8";
    const outEdges = edges.filter(e => e.from === node.id);

    html += `<div class="node">
      <div class="node-header">
        <span class="dot" style="background:${color}"></span>
        <span class="node-name">${esc(node.name)}</span>
        <span class="node-type">${esc(node.type)}</span>
      </div>`;
    if (node.description) {
      html += `<div class="node-desc">${esc(node.description)}</div>`;
    }
    html += '</div>';

    for (const edge of outEdges) {
      const target = nodes.find(n => n.id === edge.to);
      const mc = modeColor[edge.mode] || "#94a3b8";
      html += `<div class="edge">
        <span class="arrow">↓</span>
        <span class="mode" style="background:${mc}15;color:${mc}">${esc(edge.mode)}</span>
        <span class="edge-target">→ ${esc(target?.name || edge.to)}</span>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Main
const args = process.argv.slice(2);
const sopFile = args[0];
const outIdx = args.indexOf("-o");
const outFile = outIdx >= 0 ? args[outIdx + 1] : sopFile.replace(/\.sop$/, "-sopdoc.html");

if (!sopFile) {
  console.error("Usage: npx tsx scripts/render-sop.ts <file.sop> [-o output.html]");
  process.exit(1);
}

const sopPath = resolve(sopFile);
const sopDir = dirname(sopPath);
const sopText = readFileSync(sopPath, "utf-8");
const sop = parseYaml(sopText);

// Load referenced .osop.yaml files
const sections: { name: string; description: string; workflows: { title: string; yaml: string }[] }[] = [];

for (const sec of (sop.sections || [])) {
  const wfs: { title: string; yaml: string }[] = [];
  for (const wf of (sec.workflows || [])) {
    const refPath = resolve(sopDir, wf.ref);
    let yaml = "";
    if (existsSync(refPath)) {
      yaml = readFileSync(refPath, "utf-8");
    } else {
      yaml = `# File not found: ${wf.ref}`;
    }
    wfs.push({ title: wf.title, yaml });
  }
  sections.push({ name: sec.name, description: sec.description || "", workflows: wfs });
}

const totalWf = sections.reduce((s, sec) => s + sec.workflows.length, 0);

// Generate HTML
let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(sop.name || "SOP Document")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; color: #1e293b; line-height: 1.6; }
  .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }

  /* Header */
  .header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; }
  .header h1 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
  .header p { color: #64748b; font-size: 0.9375rem; margin-bottom: 0.75rem; }
  .meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .meta span { background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; color: #64748b; }

  /* TOC */
  .toc { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 2rem; }
  .toc-title { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 0.5rem; }
  .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }
  .toc a { font-size: 0.8125rem; color: #6366f1; text-decoration: none; }
  .toc a:hover { color: #4f46e5; }
  .toc .count { font-size: 0.6875rem; color: #94a3b8; }

  /* Section */
  .section { margin-bottom: 2.5rem; }
  .section-header { cursor: pointer; display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; padding: 0.5rem 0; }
  .section-header:hover h2 { color: #6366f1; }
  .chevron { color: #cbd5e1; transition: transform 0.2s; font-size: 0.875rem; margin-top: 0.25rem; }
  .section.open .chevron { transform: rotate(90deg); }
  .section h2 { font-size: 1.125rem; font-weight: 700; transition: color 0.2s; }
  .section h2 .count { font-size: 0.75rem; font-weight: 400; color: #94a3b8; margin-left: 0.5rem; }
  .section-desc { font-size: 0.8125rem; color: #64748b; }
  .section-body { margin-left: 1.5rem; }
  .section-body.hidden { display: none; }

  /* Workflow card */
  .wf { margin-bottom: 1.25rem; }
  .wf-title { font-size: 0.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; }
  .code-block { border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; background: #fff; }
  .cb-header { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .cb-dot { width: 8px; height: 8px; border-radius: 50%; }
  .cb-label { font-size: 0.6875rem; color: #94a3b8; font-family: monospace; margin-left: 8px; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
  .tab { padding: 4px 10px; font-size: 0.6875rem; font-weight: 500; border-radius: 4px; cursor: pointer; border: none; background: #f1f5f9; color: #64748b; }
  .tab.active { background: #e0e7ff; color: #4338ca; }

  /* Visual */
  .visual { padding: 1rem; }
  .node { padding: 6px 10px; border-radius: 8px; background: #f8fafc; margin-bottom: 2px; }
  .node-header { display: flex; align-items: center; gap: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .node-name { font-size: 0.75rem; font-weight: 500; color: #334155; }
  .node-type { font-size: 0.5625rem; color: #94a3b8; font-family: monospace; margin-left: auto; }
  .node-desc { font-size: 0.6875rem; color: #94a3b8; margin-top: 2px; margin-left: 14px; }
  .edge { margin-left: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.625rem; color: #94a3b8; padding: 2px 0; }
  .arrow { color: #cbd5e1; }
  .mode { padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 0.5rem; }
  .edge-target { }

  /* YAML */
  .yaml-view { background: #0f172a; padding: 1rem; overflow-x: auto; display: none; }
  .yaml-view pre { font-family: 'SF Mono', Menlo, monospace; font-size: 0.6875rem; color: #cbd5e1; line-height: 1.6; white-space: pre; }

  @media (max-width: 640px) {
    .toc-grid { grid-template-columns: 1fr; }
    .container { padding: 1rem; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${esc(sop.name || "SOP Document")}</h1>
    ${sop.description ? `<p>${esc(sop.description)}</p>` : ""}
    <div class="meta">
      ${sop.author ? `<span>${esc(sop.author)}</span>` : ""}
      ${sop.version ? `<span>v${esc(sop.version)}</span>` : ""}
      <span>${totalWf} workflows</span>
      <span>${sections.length} sections</span>
    </div>
  </div>

  <div class="toc">
    <div class="toc-title">Contents</div>
    <div class="toc-grid">
      ${sections.map(s => `<a href="#sec-${s.name.toLowerCase().replace(/\s+/g, '-')}">${esc(s.name)} <span class="count">(${s.workflows.length})</span></a>`).join("\n      ")}
    </div>
  </div>

  ${sections.map((sec, si) => {
    const anchor = `sec-${sec.name.toLowerCase().replace(/\s+/g, '-')}`;
    return `
  <div class="section open" id="${anchor}">
    <div class="section-header" onclick="this.parentElement.classList.toggle('open');this.nextElementSibling.classList.toggle('hidden')">
      <span class="chevron">▸</span>
      <div>
        <h2>${esc(sec.name)}<span class="count">(${sec.workflows.length})</span></h2>
        ${sec.description ? `<div class="section-desc">${esc(sec.description)}</div>` : ""}
      </div>
    </div>
    <div class="section-body">
      ${sec.workflows.map((wf, wi) => {
        const uid = `wf-${si}-${wi}`;
        const visual = renderVisual(wf.yaml);
        return `
      <div class="wf">
        <div class="wf-title">${esc(wf.title)}</div>
        <div class="code-block">
          <div class="cb-header">
            <span class="cb-dot" style="background:#f87171cc"></span>
            <span class="cb-dot" style="background:#fbbf24cc"></span>
            <span class="cb-dot" style="background:#4ade80cc"></span>
          </div>
          ${visual ? `
          <div class="tabs">
            <button class="tab active" onclick="showTab('${uid}','visual',this)">Visual</button>
            <button class="tab" onclick="showTab('${uid}','yaml',this)">.osop</button>
          </div>
          <div id="${uid}-visual">${visual}</div>
          <div id="${uid}-yaml" class="yaml-view"><pre>${esc(wf.yaml)}</pre></div>
          ` : `
          <div class="yaml-view" style="display:block"><pre>${esc(wf.yaml)}</pre></div>
          `}
        </div>
      </div>`;
      }).join("")}
    </div>
  </div>`;
  }).join("")}

</div>
<script>
function showTab(uid, tab, btn) {
  document.getElementById(uid+'-visual').style.display = tab==='visual' ? 'block' : 'none';
  document.getElementById(uid+'-yaml').style.display = tab==='yaml' ? 'block' : 'none';
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}
</script>
</body>
</html>`;

writeFileSync(resolve(outFile), html, "utf-8");
console.log(`SOP Doc: ${resolve(outFile)} (${(Buffer.byteLength(html) / 1024).toFixed(1)}KB)`);
