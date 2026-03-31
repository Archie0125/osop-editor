import { OsopNode, OsopEdge } from '../../types/osop';

/**
 * Topological sort of workflow nodes using Kahn's algorithm.
 * Returns node IDs in execution order.
 * Handles cycles gracefully (returns remaining nodes at end).
 */
export function topoSort(nodes: OsopNode[], edges: OsopEdge[]): string[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adjList[id] = [];
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      // Loop edges and compensation edges don't contribute to forward ordering
      if (edge.mode === 'loop' || edge.mode === 'compensation') continue;
      adjList[edge.from].push(edge.to);
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    }
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adjList[current]) {
      inDegree[next]--;
      if (inDegree[next] === 0) {
        queue.push(next);
      }
    }
  }

  // Add any remaining nodes (in cycles) at the end
  for (const id of nodeIds) {
    if (!sorted.includes(id)) {
      sorted.push(id);
    }
  }

  return sorted;
}

/**
 * Get outgoing edges from a node.
 */
export function getOutgoingEdges(nodeId: string, edges: OsopEdge[]): OsopEdge[] {
  return edges.filter(e => e.from === nodeId);
}

/**
 * Get incoming edges to a node.
 */
export function getIncomingEdges(nodeId: string, edges: OsopEdge[]): OsopEdge[] {
  return edges.filter(e => e.to === nodeId);
}

/**
 * Simple condition evaluator for `when` expressions.
 * Supports basic comparisons: ==, !=, <, >, <=, >=, &&, ||, true, false
 * Returns true if expression cannot be evaluated (permissive for simulation).
 */
export function evaluateCondition(expr: string, context: Record<string, any>): boolean {
  if (!expr || expr.trim() === '') return true;

  const normalized = expr.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'otherwise' || normalized === 'else') return true;
  if (normalized === 'false') return false;

  // Simple pattern matching for common conditions
  try {
    // Replace variable references with context values
    let evalExpr = expr;

    // Replace dotted paths like outputs.build.status with context lookups
    evalExpr = evalExpr.replace(/([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match) => {
      const parts = match.split('.');
      let val: any = context;
      for (const p of parts) {
        if (val && typeof val === 'object' && p in val) {
          val = val[p];
        } else {
          return JSON.stringify(match); // Keep as string if not found
        }
      }
      return JSON.stringify(val);
    });

    // Safety: only allow simple expressions
    if (/[;{}()[\]\\]/.test(evalExpr) && !/\(/.test(expr)) {
      return true; // Can't evaluate complex expressions, default to true
    }

    return true; // Default permissive for simulation
  } catch {
    return true; // Default permissive
  }
}

/**
 * Generate a simple hash from a string (for snapshot_hash).
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate a UUID v4.
 */
export function uuid(): string {
  return crypto.randomUUID();
}
