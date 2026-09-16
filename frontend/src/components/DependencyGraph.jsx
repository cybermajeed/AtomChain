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
import { Package, Warning, ShieldCheck, Cube } from '@phosphor-icons/react';

const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 30 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = graph.node(node.id);
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
  
  let borderColor = 'border-severity-low/50';
  let shadowColor = 'shadow-severity-low/10';
  let bgColor = 'bg-severity-low/10';
  let Icon = ShieldCheck;
  let textColor = 'text-severity-low';
  
  if (data.risk === 'CRITICAL') {
    borderColor = 'border-severity-critical/50';
    shadowColor = 'shadow-severity-critical/10';
    bgColor = 'bg-severity-critical/10';
    Icon = Warning;
    textColor = 'text-severity-critical';
  } else if (data.risk === 'HIGH') {
    borderColor = 'border-severity-high/50';
    shadowColor = 'shadow-severity-high/10';
    bgColor = 'bg-severity-high/10';
    Icon = Warning;
    textColor = 'text-severity-high';
  } else if (data.risk === 'MEDIUM' || data.risk === 'MODERATE' || isRoot) {
    borderColor = 'border-severity-moderate/50';
    shadowColor = 'shadow-severity-moderate/10';
    bgColor = 'bg-severity-moderate/10';
    Icon = isRoot ? Cube : Package;
    textColor = 'text-severity-moderate';
  }

  return (
    <div className={`px-3 py-2 shadow-md rounded-lg border bg-surface-card-dark/95 backdrop-blur-md ${borderColor} flex items-center gap-2 w-[180px] hover:border-muted-strong transition-colors`}>
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 !bg-muted-strong !border-none" />
      <div className={`p-1.5 rounded-md ${bgColor}`}>
        <Icon size={14} className={textColor} />
      </div>
      <div className="flex flex-col overflow-hidden w-full">
        <span className="text-xs font-bold text-on-dark truncate leading-tight" title={data.label}>{data.label}</span>
        {!isRoot && (
          <span className="text-[10px] font-plex text-muted truncate leading-tight">{data.version || 'Unknown'}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 !bg-muted-strong !border-none" />
    </div>
  );
};

const nodeTypes = {
  customPackage: CustomPackageNode,
};

const bucketOf = (risk) => {
  const r = String(risk || '').toUpperCase();
  if (r === 'CRITICAL') return 'CRITICAL';
  if (r === 'HIGH') return 'HIGH';
  if (r === 'MEDIUM' || r === 'MODERATE') return 'MODERATE';
  return 'SAFE';
};

export default function DependencyGraph({ dependencies, riskFilter, reconstructKey = 0 }) {
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

    const allowed = new Set(
      Array.isArray(riskFilter) && riskFilter.length ? riskFilter : ['SAFE', 'MODERATE', 'HIGH', 'CRITICAL']
    );
    const kept = new Set();
    initialNodes.forEach((n) => {
      if (n.id === 'root' || allowed.has(bucketOf(n.data.risk))) kept.add(n.id);
    });

    let visibleNodes = initialNodes.filter((n) => kept.has(n.id));
    let visibleEdges = initialEdges.filter((e) => kept.has(e.source) && kept.has(e.target));

    const connected = new Set(['root']);
    visibleEdges.forEach((e) => {
      connected.add(e.source);
      connected.add(e.target);
    });
    visibleNodes = visibleNodes.filter((n) => n.id === 'root' || connected.has(n.id));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      visibleNodes,
      visibleEdges,
      'LR'
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [dependencies, riskFilter, reconstructKey, setNodes, setEdges]);

  return (
    <div className="dg-flow relative w-full h-[600px] bg-canvas-dark rounded-xl border border-hairline-on-dark overflow-hidden">
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
        <Controls position="top-right" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-4 text-xs text-muted-strong bg-surface-elevated-dark p-3 rounded-lg border border-hairline-on-dark shadow-xl">
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-severity-low"></div> Low</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-severity-moderate"></div> Moderate</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-severity-high"></div> High</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-severity-critical"></div> Critical</div>
      </div>
    </div>
  );
}
