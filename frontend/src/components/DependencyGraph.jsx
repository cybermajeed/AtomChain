import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Package, ShieldAlert, ShieldCheck, Box } from 'lucide-react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 80;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // Shift position back by half width/height to center the node
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Custom Node Component
const CustomPackageNode = ({ data }) => {
  const isRoot = data.type === 'root';
  
  let borderColor = 'border-trading-up/50';
  let shadowColor = 'shadow-trading-up/10';
  let bgColor = 'bg-trading-up/10';
  let Icon = ShieldCheck;
  let textColor = 'text-trading-up';
  
  if (data.risk === 'CRITICAL' || data.risk === 'HIGH') {
    borderColor = 'border-trading-down/50';
    shadowColor = 'shadow-trading-down/10';
    bgColor = 'bg-trading-down/10';
    Icon = ShieldAlert;
    textColor = 'text-trading-down';
  } else if (data.risk === 'MEDIUM' || data.risk === 'MODERATE' || isRoot) {
    borderColor = 'border-[#FCD535]/50';
    shadowColor = 'shadow-[#FCD535]/10';
    bgColor = 'bg-[#FCD535]/10';
    Icon = isRoot ? Box : Package;
    textColor = 'text-[#FCD535]';
  }

  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl border bg-surface-card-dark/80 backdrop-blur-md ${borderColor} ${shadowColor} flex items-center gap-3 w-[240px]`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-muted-strong !border-none" />
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon size={20} className={textColor} />
      </div>
      <div className="flex flex-col overflow-hidden w-full">
        <span className="text-body-sm font-semibold text-on-dark truncate" title={data.label}>{data.label}</span>
        {!isRoot && (
          <span className="text-[11px] font-plex text-muted truncate">{data.version || 'Unknown version'}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-muted-strong !border-none" />
    </div>
  );
};

const nodeTypes = {
  customPackage: CustomPackageNode,
};

export default function DependencyGraph({ dependencies }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!dependencies || dependencies.length === 0) return;

    const initialNodes = [];
    const initialEdges = [];
    const addedNodes = new Set();

    // Root Node
    initialNodes.push({
      id: 'root',
      type: 'customPackage',
      data: { id: 'root', label: 'Root Project', type: 'root', risk: 'MEDIUM' },
      position: { x: 0, y: 0 },
    });
    addedNodes.add('root');

    let lastDirect = 'root';

    dependencies.forEach(dep => {
      const nodeId = dep.id;
      if (!addedNodes.has(nodeId)) {
         addedNodes.add(nodeId);
         const nameParts = nodeId.split('@');
         let name = nameParts[0];
         let version = nameParts[1];
         if (nodeId.startsWith('@') && nameParts.length > 2) {
            name = '@' + nameParts[1];
            version = nameParts[2];
         } else if (!nodeId.includes('@') || nameParts.length === 1) {
            name = nodeId;
            version = "";
         }
         
         initialNodes.push({
           id: nodeId,
           type: 'customPackage',
           data: { 
             id: nodeId, 
             label: name, 
             version: version,
             risk: dep.risk 
           },
           position: { x: 0, y: 0 },
         });
      }
      
      let sourceNode = 'root';
      if (dep.direct) {
        lastDirect = nodeId;
      } else {
        sourceNode = lastDirect;
      }
      
      initialEdges.push({
        id: `edge-${sourceNode}-${nodeId}`,
        source: sourceNode,
        target: nodeId,
        type: 'smoothstep',
        animated: dep.risk === 'CRITICAL' || dep.risk === 'HIGH',
        style: {
           stroke: dep.risk === 'CRITICAL' || dep.risk === 'HIGH' ? '#F6465D' : '#3B4048',
           strokeWidth: 2,
        },
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [dependencies, setNodes, setEdges]);

  return (
    <div className="relative w-full h-[600px] bg-canvas-dark rounded-xl border border-hairline-on-dark overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2A2F38" gap={16} size={1} />
        <MiniMap 
          nodeStrokeColor="#2A2F38" 
          nodeColor="#1E232B"
          maskColor="rgba(11, 14, 17, 0.7)"
          style={{ backgroundColor: '#0B0E11', border: '1px solid #2A2F38', borderRadius: '8px' }}
        />
        <Controls 
           className="bg-surface-elevated-dark border border-hairline-on-dark rounded-md fill-on-dark shadow-xl"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-4 text-xs text-muted-strong bg-surface-elevated-dark p-3 rounded-lg border border-hairline-on-dark shadow-xl">
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-trading-up"></div> Safe</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#FCD535]"></div> Medium</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-trading-down"></div> High/Critical</div>
      </div>
    </div>
  );
}
