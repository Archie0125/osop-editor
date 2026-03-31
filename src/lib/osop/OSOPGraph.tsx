import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IOSOPWorkflow, IOSOPNode } from './types';
import dagre from 'dagre';

// 1. Standard Node Component
const OSOPCustomNode = ({ data }: { data: { node: IOSOPNode } }) => {
  const { node } = data;
  
  const getBgColor = (type: string) => {
    switch (type) {
      case 'human': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'agent': return 'bg-purple-100 border-purple-500 text-purple-900';
      case 'api': return 'bg-blue-100 border-blue-500 text-blue-900';
      case 'db': return 'bg-emerald-100 border-emerald-500 text-emerald-900';
      case 'docker': return 'bg-cyan-100 border-cyan-500 text-cyan-900';
      case 'git': return 'bg-gray-100 border-gray-500 text-gray-900';
      case 'cicd': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-slate-100 border-slate-500 text-slate-900';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'human': return '👤';
      case 'agent': return '🤖';
      case 'api': return '🌐';
      case 'db': return '🗄️';
      case 'docker': return '🐳';
      case 'git': return '🐙';
      case 'cicd': return '🚀';
      default: return '⚙️';
    }
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-xl border-2 w-64 ${getBgColor(node.type)}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2 border-b pb-2 border-black/10">
        <span className="text-xl">{getIcon(node.type)}</span>
        <div>
          <div className="font-bold text-sm">{node.id}</div>
          <div className="text-xs opacity-75 uppercase tracking-wider font-mono">{node.type}</div>
        </div>
      </div>
      <div className="text-xs leading-relaxed line-clamp-3">
        {node.purpose}
      </div>
      {node.role && (
        <div className="mt-2 text-[10px] font-mono bg-black/5 px-2 py-1 rounded inline-block">
          Role: {node.role}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// 2. Condition/Router Node Component (Diamond Shape)
const ConditionCustomNode = ({ data }: { data: { node: IOSOPNode } }) => {
  const { node } = data;
  
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Diamond Background */}
      <div className="absolute inset-0 bg-amber-100 border-2 border-amber-500 shadow-md transform rotate-45 rounded-lg"></div>
      
      {/* Content (Un-rotated) */}
      <div className="relative z-10 text-center p-2 flex flex-col items-center justify-center">
        <span className="text-xl mb-1">🔀</span>
        <div className="font-bold text-xs text-amber-900 break-words w-24">{node.id}</div>
        <div className="text-[9px] text-amber-700 mt-1 font-mono uppercase">IF / ELSE</div>
      </div>

      {/* Handles placed on the edges of the diamond */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 -mt-4" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 -mb-4" id="bottom" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 -ml-4" id="left" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 -mr-4" id="right" />
    </div>
  );
};

// 3. Parallel Node Component (Diamond Shape with +)
const ParallelCustomNode = ({ data }: { data: { node: IOSOPNode } }) => {
  const { node } = data;
  
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Diamond Background */}
      <div className="absolute inset-0 bg-emerald-100 border-2 border-emerald-500 shadow-md transform rotate-45 rounded-lg"></div>
      
      {/* Content (Un-rotated) */}
      <div className="relative z-10 text-center p-2 flex flex-col items-center justify-center">
        <span className="text-xl mb-1">➕</span>
        <div className="font-bold text-xs text-emerald-900 break-words w-24">{node.id}</div>
        <div className="text-[9px] text-emerald-700 mt-1 font-mono uppercase">PARALLEL</div>
      </div>

      {/* Handles placed on the edges of the diamond */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 -mt-4" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 -mb-4" id="bottom" />
      <Handle type="source" position={Position.Left} className="w-3 h-3 -ml-4" id="left" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 -mr-4" id="right" />
    </div>
  );
};

const nodeTypes = {
  osopNode: OSOPCustomNode,
  conditionNode: ConditionCustomNode,
  parallelNode: ParallelCustomNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 80 });

  nodes.forEach((node) => {
    // Estimate dimensions based on node type
    const isDiamond = node.type === 'conditionNode' || node.type === 'parallelNode';
    const width = isDiamond ? 160 : 256;
    const height = isDiamond ? 160 : 150;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isDiamond = node.type === 'conditionNode' || node.type === 'parallelNode';
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // Shift the dagre node position (anchor=center center) to the top left
      position: {
        x: nodeWithPosition.x - (isDiamond ? 160 : 256) / 2,
        y: nodeWithPosition.y - (isDiamond ? 160 : 150) / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

interface OSOPGraphProps {
  workflow: IOSOPWorkflow;
}

export const OSOPGraph: React.FC<OSOPGraphProps> = ({ workflow }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const rawNodes: Node[] = workflow.nodes.map((node) => {
      let type = 'osopNode';
      if (node.type === 'system') {
        if (node.subtype === 'router') type = 'conditionNode';
        if (node.subtype === 'parallel') type = 'parallelNode';
      }
      return {
        id: node.id,
        type,
        position: { x: 0, y: 0 }, // Will be overwritten by layout
        data: { node },
      };
    });

    const rawEdges: Edge[] = workflow.edges.map((edge, index) => {
      let edgeLabel = edge.label;
      if (edge.mode === 'conditional' && edge.when) {
        edgeLabel = edge.when === 'otherwise' ? 'ELSE' : `IF: ${edge.when}`;
      } else if (edge.mode === 'loop' && edge.when) {
        edgeLabel = `LOOP: ${edge.when}`;
      } else if (edge.mode === 'fallback') {
        edgeLabel = edgeLabel || 'FALLBACK';
      } else if (!edgeLabel && edge.mode !== 'sequential') {
        edgeLabel = edge.mode;
      }

      // Determine colors and styles based on mode
      let strokeColor = '#94a3b8'; // slate-400
      let labelBgFill = '#f8fafc'; // slate-50
      let labelColor = '#475569'; // slate-600
      let strokeDasharray: string | undefined = undefined;

      if (edge.mode === 'conditional') {
        strokeColor = '#f59e0b'; // amber-500
        labelBgFill = '#fef3c7'; // amber-100
        labelColor = '#b45309'; // amber-700
      } else if (edge.mode === 'fallback' || edge.mode === 'error') {
        strokeColor = '#ef4444'; // red-500
        labelBgFill = '#fef2f2'; // red-50
        labelColor = '#b91c1c'; // red-700
        strokeDasharray = '5 5';
      } else if (edge.mode === 'loop') {
        strokeColor = '#8b5cf6'; // violet-500
        labelBgFill = '#f5f3ff'; // violet-50
        labelColor = '#6d28d9'; // violet-700
        strokeDasharray = '5 5';
      }

      return {
        id: `e-${edge.from}-${edge.to}-${index}`,
        source: edge.from,
        target: edge.to,
        animated: edge.mode === 'event' || edge.mode === 'loop',
        label: edgeLabel,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: labelBgFill, stroke: strokeColor },
        labelStyle: { fill: labelColor, fontWeight: 600, fontSize: 11, fontFamily: 'monospace' },
        style: { strokeWidth: 2, stroke: strokeColor, strokeDasharray },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [workflow, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-slate-50/50 rounded-xl border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap zoomable pannable nodeColor={(n) => {
          if (n.type === 'conditionNode') return '#fcd34d';
          if (n.type === 'parallelNode') return '#6ee7b7';
          return '#e2e8f0';
        }} />
      </ReactFlow>
    </div>
  );
};

