import React, { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { OsopWorkflow, OsopNodeType } from '../types/osop';
import type { WorkflowRiskReport } from '../lib/risk';

interface GraphViewProps {
  workflow: OsopWorkflow;
  riskReport?: WorkflowRiskReport | null;
  riskOverlay?: boolean;
}

const NODE_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  human:      { bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-900' },
  agent:      { bg: 'bg-violet-50',  border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-900' },
  api:        { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     text: 'text-blue-900' },
  cli:        { bg: 'bg-slate-50',   border: 'border-slate-300',  badge: 'bg-slate-200 text-slate-700',   text: 'text-slate-900' },
  db:         { bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700',text: 'text-emerald-900' },
  git:        { bg: 'bg-gray-50',    border: 'border-gray-300',   badge: 'bg-gray-200 text-gray-700',     text: 'text-gray-900' },
  docker:     { bg: 'bg-cyan-50',    border: 'border-cyan-200',   badge: 'bg-cyan-100 text-cyan-700',     text: 'text-cyan-900' },
  cicd:       { bg: 'bg-red-50',     border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       text: 'text-red-900' },
  system:     { bg: 'bg-slate-50',   border: 'border-slate-200',  badge: 'bg-slate-200 text-slate-600',   text: 'text-slate-800' },
  mcp:        { bg: 'bg-indigo-50',  border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-900' },
  company:    { bg: 'bg-amber-50',   border: 'border-amber-300',  badge: 'bg-amber-200 text-amber-800',   text: 'text-amber-900' },
  department: { bg: 'bg-yellow-50',  border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-900' },
  event:      { bg: 'bg-pink-50',    border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700',     text: 'text-pink-900' },
  gateway:    { bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   text: 'text-amber-900' },
  data:       { bg: 'bg-teal-50',    border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700',     text: 'text-teal-900' },
  infra:      { bg: 'bg-sky-50',     border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700',       text: 'text-sky-900' },
};

const NODE_ICONS: Record<string, string> = {
  human: '\u{1F464}', agent: '\u{1F916}', api: '\u{1F310}', cli: '\u{1F4BB}',
  db: '\u{1F5C3}', git: '\u{1F500}', docker: '\u{1F433}', cicd: '\u{1F680}',
  system: '\u{2699}', mcp: '\u{1F50C}', company: '\u{1F3E2}', department: '\u{1F3E0}',
  event: '\u{26A1}', gateway: '\u{1F500}', data: '\u{1F4CA}',
  infra: '\u{2601}',
};

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string; animated?: boolean }> = {
  sequential:  { stroke: '#94a3b8' },
  conditional: { stroke: '#f59e0b', strokeDasharray: '5 3' },
  parallel:    { stroke: '#10b981' },
  loop:        { stroke: '#8b5cf6', strokeDasharray: '8 4', animated: true },
  fallback:    { stroke: '#ef4444', strokeDasharray: '5 3' },
  error:       { stroke: '#ef4444' },
  timeout:     { stroke: '#f97316', strokeDasharray: '3 3' },
  event:        { stroke: '#ec4899', animated: true },
  compensation: { stroke: '#dc2626', strokeDasharray: '8 3', animated: true },
  message:      { stroke: '#6366f1', strokeDasharray: '10 5' },
  dataflow:     { stroke: '#14b8a6', strokeDasharray: '4 4' },
  signal:       { stroke: '#a855f7', strokeDasharray: '6 6', animated: true },
  weighted:     { stroke: '#0ea5e9', strokeDasharray: '3 2' },
};

const RISK_BORDER: Record<string, string> = {
  critical: 'ring-2 ring-red-500 border-red-500',
  high:     'ring-2 ring-orange-400 border-orange-400',
  medium:   'ring-1 ring-yellow-400 border-yellow-400',
  low:      '',
};

const RISK_BADGE_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white animate-pulse',
  high:     'bg-orange-600 text-white',
  medium:   'bg-yellow-600 text-white',
  low:      'bg-slate-500 text-white',
};

const CustomNode = ({ data }: any) => {
  const colors = NODE_COLORS[data.type] || NODE_COLORS.system;
  const icon = NODE_ICONS[data.type] || '\u{2699}';
  const isCompany = data.type === 'company' || data.type === 'department';

  const riskLevel = data.riskLevel as string | undefined;
  const riskFindings = data.riskFindings as number | undefined;
  const showRisk = data.riskOverlay && riskLevel;
  const riskBorder = showRisk ? (RISK_BORDER[riskLevel!] || '') : '';
  const companyRing = !showRisk && isCompany ? 'ring-2 ring-amber-300/50' : '';

  return (
    <div className={`${colors.bg} border-2 ${showRisk ? '' : colors.border} rounded-lg shadow-sm w-60 text-sm ${riskBorder} ${companyRing} relative`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />

      {/* Risk badge overlay */}
      {showRisk && riskLevel !== 'low' && (
        <div className={`absolute -top-2 -right-2 z-10 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${RISK_BADGE_COLORS[riskLevel!] || ''}`}>
          {riskLevel}
          {riskFindings ? ` (${riskFindings})` : ''}
        </div>
      )}

      <div className={`p-2.5 border-b ${showRisk ? '' : colors.border} flex items-center gap-2 rounded-t-lg`}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${colors.text} truncate text-xs`}>{data.label}</div>
          {data.purpose && <div className="text-[10px] text-slate-500 truncate">{data.purpose}</div>}
        </div>
        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${colors.badge}`}>
          {data.type}
        </span>
      </div>

      {/* Company info */}
      {data.company && (
        <div className="px-2.5 py-1.5 bg-amber-50 border-b border-amber-100 text-[10px]">
          <div className="font-semibold text-amber-800">{data.company.name}</div>
          {data.company.role && <div className="text-amber-600">Role: {data.company.role}</div>}
          {data.company.sla && <div className="text-amber-600">SLA: {data.company.sla}</div>}
        </div>
      )}

      <div className="p-2 flex flex-col gap-1.5">
        {data.inputs?.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5 px-1">Inputs</div>
            {data.inputs.map((inp: any, i: number) => (
              <div key={i} className="text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mb-0.5">
                {inp.name}
              </div>
            ))}
          </div>
        )}
        {data.outputs?.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5 px-1">Outputs</div>
            {data.outputs.map((out: any, i: number) => (
              <div key={i} className="text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-0.5">
                {out.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
};

export function GraphView({ workflow, riskReport, riskOverlay }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Build a lookup for risk scores per node
  const riskScoreMap = useMemo(() => {
    if (!riskReport) return new Map<string, { level: string; findings: number }>();
    const map = new Map<string, { level: string; findings: number }>();
    for (const ns of riskReport.node_scores) {
      map.set(ns.node_id, { level: ns.risk_level, findings: ns.findings.length });
    }
    return map;
  }, [riskReport]);

  useEffect(() => {
    const newNodes: Node[] = workflow.nodes.map((node, index) => {
      const riskInfo = riskScoreMap.get(node.id);
      return {
        id: node.id,
        position: { x: 300 * (index % 4) + 50, y: 200 * Math.floor(index / 4) + 50 },
        data: {
          label: node.name || node.id,
          type: node.type,
          purpose: node.purpose,
          inputs: node.inputs,
          outputs: node.outputs,
          company: node.company,
          riskOverlay: riskOverlay,
          riskLevel: riskInfo?.level,
          riskFindings: riskInfo?.findings,
        },
        type: 'custom',
      };
    });

    const newEdges: Edge[] = workflow.edges.map((edge) => {
      const mode = edge.mode || 'sequential';
      const style = EDGE_STYLES[mode] || EDGE_STYLES.sequential;
      return {
        id: `e-${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        animated: style.animated ?? false,
        style: { stroke: style.stroke, strokeWidth: 2, strokeDasharray: style.strokeDasharray },
        label: edge.label || (edge.when ? `${mode}: ${edge.when}` : undefined),
        labelStyle: { fontSize: 10, fill: style.stroke },
        labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflow, riskOverlay, riskScoreMap, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
