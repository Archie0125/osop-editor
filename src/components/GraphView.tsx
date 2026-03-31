import React, { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { OsopWorkflow } from '../types/osop';

interface GraphViewProps {
  workflow: OsopWorkflow;
}

const CustomNode = ({ data }: any) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm w-56 text-sm">
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />
      
      <div className="p-2 border-b border-slate-100 flex flex-col items-center bg-slate-50 rounded-t-lg">
        <span className="font-bold text-slate-700 text-center">{data.label}</span>
        <span className="text-[10px] text-slate-500 uppercase mt-1 px-2 py-0.5 bg-slate-200 rounded-full">
          {data.type}
        </span>
      </div>
      
      <div className="p-2 flex flex-col gap-2">
        {data.inputs && data.inputs.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1 px-1">Inputs</div>
            {data.inputs.map((inp: any, i: number) => (
              <div key={i} className="text-xs text-slate-600 bg-blue-50/50 px-2 py-1 rounded border border-blue-100 mb-1 flex flex-col">
                <span className="font-medium text-blue-800">{inp.name}</span>
                {(inp.schema || inp.type) && (
                  <span className="text-[10px] text-blue-500 mt-0.5 font-mono">{inp.schema || inp.type}</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {data.outputs && data.outputs.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1 px-1">Outputs</div>
            {data.outputs.map((out: any, i: number) => (
              <div key={i} className="text-xs text-slate-600 bg-emerald-50/50 px-2 py-1 rounded border border-emerald-100 mb-1 flex flex-col">
                <span className="font-medium text-emerald-800">{out.name}</span>
                {(out.schema || out.type) && (
                  <span className="text-[10px] text-emerald-500 mt-0.5 font-mono">{out.schema || out.type}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
};

export function GraphView({ workflow }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  useEffect(() => {
    const newNodes: Node[] = workflow.nodes.map((node, index) => ({
      id: node.id,
      position: { x: 280 * index + 50, y: 150 },
      data: { 
        label: node.name || node.id,
        type: node.type,
        inputs: node.inputs,
        outputs: node.outputs
      },
      type: 'custom',
    }));

    const newEdges: Edge[] = workflow.edges.map((edge) => ({
      id: `e-${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflow, setNodes, setEdges]);

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
