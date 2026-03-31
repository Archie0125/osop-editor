import yaml from 'js-yaml';
import { OsopWorkflow } from '../../types/osop';
import { WorkflowStats, WorkflowRunRecord, IterationRecord } from './types';
import { runStore } from './store';
import { uuid } from './graph-utils';

/**
 * Build a prompt for AI to analyze and suggest workflow improvements.
 */
export function buildIterationPrompt(
  workflow: OsopWorkflow,
  yamlText: string,
  stats: WorkflowStats,
  runs: WorkflowRunRecord[]
): string {
  const slowSteps = Object.entries(stats.node_stats)
    .filter(([, ns]) => ns.avg_duration_ms > 2000)
    .sort(([, a], [, b]) => b.avg_duration_ms - a.avg_duration_ms)
    .map(([id, ns]) => `- ${id}: avg ${(ns.avg_duration_ms / 1000).toFixed(1)}s`);

  const failureHotspots = Object.entries(stats.node_stats)
    .filter(([, ns]) => ns.failure_rate > 0.05)
    .sort(([, a], [, b]) => b.failure_rate - a.failure_rate)
    .map(([id, ns]) => `- ${id}: ${(ns.failure_rate * 100).toFixed(0)}% failure rate${ns.common_errors.length > 0 ? ` (${ns.common_errors.join(', ')})` : ''}`);

  const recentFailures = runs
    .filter(r => r.status === 'FAILED')
    .slice(0, 3)
    .map(r => `- Run ${r.run_id.slice(0, 8)}: ${r.error_summary}`);

  return `You are an OSOP workflow optimization expert. Analyze this workflow and its execution data, then output an IMPROVED version.

## Current Workflow YAML
\`\`\`yaml
${yamlText}
\`\`\`

## Execution Statistics (${stats.total_runs} runs)
- Success rate: ${(stats.success_rate * 100).toFixed(0)}%
- Average duration: ${(stats.avg_duration_ms / 1000).toFixed(1)}s

${slowSteps.length > 0 ? `### Slow Steps\n${slowSteps.join('\n')}` : ''}

${failureHotspots.length > 0 ? `### Failure Hotspots\n${failureHotspots.join('\n')}` : ''}

${recentFailures.length > 0 ? `### Recent Failures\n${recentFailures.join('\n')}` : ''}

## Instructions
1. Analyze the bottlenecks and failure patterns
2. Suggest concrete improvements:
   - Add retry_policy to frequently failing nodes
   - Add fallback edges for critical paths
   - Parallelize independent sequential steps
   - Add timeout_sec to slow steps
   - Improve success_criteria
   - Add preconditions where appropriate
3. Increment the metadata.version (bump patch version)
4. Update metadata.change_summary with what you changed
5. Output ONLY the improved YAML. No markdown fences, no explanation.`;
}

/**
 * Create an iteration record from analysis (without AI - just stats).
 */
export function analyzeWorkflow(
  workflow: OsopWorkflow,
  stats: WorkflowStats,
  runs: WorkflowRunRecord[]
): IterationRecord {
  const slowSteps = Object.entries(stats.node_stats)
    .filter(([, ns]) => ns.avg_duration_ms > 2000)
    .sort(([, a], [, b]) => b.avg_duration_ms - a.avg_duration_ms)
    .map(([id, ns]) => ({ node_id: id, avg_duration_ms: ns.avg_duration_ms }));

  const failureHotspots = Object.entries(stats.node_stats)
    .filter(([, ns]) => ns.failure_rate > 0.05)
    .sort(([, a], [, b]) => b.failure_rate - a.failure_rate)
    .map(([id, ns]) => ({
      node_id: id,
      failure_rate: ns.failure_rate,
      common_errors: ns.common_errors,
    }));

  const bottlenecks: Array<{ node_id: string; reason: string }> = [];
  // Find nodes that are both slow AND have high failure rates
  for (const slow of slowSteps) {
    const fail = failureHotspots.find(f => f.node_id === slow.node_id);
    if (fail) {
      bottlenecks.push({
        node_id: slow.node_id,
        reason: `Slow (${(slow.avg_duration_ms / 1000).toFixed(1)}s) AND unreliable (${(fail.failure_rate * 100).toFixed(0)}% failure)`,
      });
    }
  }

  const suggestions: IterationRecord['suggestions'] = [];

  for (const hotspot of failureHotspots) {
    const node = workflow.nodes.find(n => n.id === hotspot.node_id);
    if (node && !node.retry_policy) {
      suggestions.push({
        type: 'add_retry',
        target_node_ids: [hotspot.node_id],
        description: `Add retry policy to ${hotspot.node_id} (${(hotspot.failure_rate * 100).toFixed(0)}% failure rate)`,
      });
    }
    // Check if fallback edges exist
    const hasFallback = workflow.edges.some(e => e.from === hotspot.node_id && (e.mode === 'fallback' || e.mode === 'error'));
    if (!hasFallback) {
      suggestions.push({
        type: 'restructure',
        target_node_ids: [hotspot.node_id],
        description: `Add fallback edge for ${hotspot.node_id} to handle failures gracefully`,
      });
    }
  }

  for (const slow of slowSteps) {
    const node = workflow.nodes.find(n => n.id === slow.node_id);
    if (node && !node.timeout_sec) {
      suggestions.push({
        type: 'optimize',
        target_node_ids: [slow.node_id],
        description: `Add timeout to ${slow.node_id} (avg ${(slow.avg_duration_ms / 1000).toFixed(1)}s)`,
      });
    }
  }

  // Check for parallelization opportunities
  const seqChains = findSequentialChains(workflow);
  for (const chain of seqChains) {
    if (chain.length >= 3) {
      // Check if middle nodes are independent
      suggestions.push({
        type: 'parallelize',
        target_node_ids: chain,
        description: `Consider parallelizing independent steps in chain: ${chain.join(' → ')}`,
      });
    }
  }

  const record: IterationRecord = {
    iteration_id: uuid(),
    workflow_id: workflow.id,
    based_on_runs: runs.map(r => r.run_id),
    analysis: {
      slow_steps: slowSteps,
      failure_hotspots: failureHotspots,
      bottlenecks,
    },
    suggestions,
    status: 'proposed',
    created_at: new Date().toISOString(),
  };

  return record;
}

function findSequentialChains(workflow: OsopWorkflow): string[][] {
  const chains: string[][] = [];
  const visited = new Set<string>();

  for (const node of workflow.nodes) {
    if (visited.has(node.id)) continue;

    const chain: string[] = [node.id];
    visited.add(node.id);

    let current = node.id;
    while (true) {
      const outEdges = workflow.edges.filter(
        e => e.from === current && (!e.mode || e.mode === 'sequential')
      );
      if (outEdges.length !== 1) break;
      const next = outEdges[0].to;
      const inEdges = workflow.edges.filter(e => e.to === next);
      if (inEdges.length !== 1) break;
      if (visited.has(next)) break;

      chain.push(next);
      visited.add(next);
      current = next;
    }

    if (chain.length >= 2) chains.push(chain);
  }

  return chains;
}
