#!/usr/bin/env npx tsx
/**
 * OSOP Report CLI
 * Usage:
 *   npx tsx scripts/osop-report.ts <file.osop> [file.osoplog.yaml] [options]
 * Options:
 *   --format html|text|ansi   Output format (default: auto-detect)
 *   -o, --output <file>       Output file (default: stdout for text, auto-name for html)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import { generateHtmlReport } from '../src/lib/report/html-report';
import { generateTextReport } from '../src/lib/report/text-report';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`OSOP Report — Generate reports from .osop + .osoplog
Usage: npx tsx scripts/osop-report.ts <file.osop> [file.osoplog] [options]
  --format html|text|ansi  (default: terminal→ansi, pipe→text)
  -o <file>                Output file (html auto-generates filename)`);
  process.exit(0);
}

let osopPath = '', osoplogPath = '', outputPath = '', format = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') { outputPath = args[++i]; continue; }
  if (args[i] === '--format') { format = args[++i]; continue; }
  if (!osopPath) { osopPath = args[i]; continue; }
  if (!osoplogPath) { osoplogPath = args[i]; continue; }
}

if (!osopPath) { console.error('Error: no .osop file'); process.exit(1); }

const osopYaml = readFileSync(resolve(osopPath), 'utf-8');
const osoplogYaml = osoplogPath ? readFileSync(resolve(osoplogPath), 'utf-8') : undefined;

// Auto-detect format
if (!format) {
  format = outputPath?.endsWith('.html') ? 'html' : (process.stdout.isTTY ? 'ansi' : 'text');
}

if (format === 'html') {
  const html = generateHtmlReport(osopYaml, osoplogYaml);
  const out = outputPath || basename(osopPath).replace(/\.(osop|yaml|yml)$/g, '') + '-report.html';
  writeFileSync(resolve(out), html);
  console.error(`Report: ${resolve(out)} (${(html.length / 1024).toFixed(1)}KB)`);
} else {
  const text = generateTextReport(osopYaml, osoplogYaml, format === 'ansi');
  if (outputPath) {
    writeFileSync(resolve(outputPath), text);
    console.error(`Report: ${resolve(outputPath)}`);
  } else {
    process.stdout.write(text);
  }
}
