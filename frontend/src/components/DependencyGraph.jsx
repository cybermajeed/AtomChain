import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function DependencyGraph({ dependencies }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
      
      const handleResize = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          });
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const graphData = useMemo(() => {
    if (!dependencies || dependencies.length === 0) return { nodes: [], links: [] };
    
    const nodes = [];
    const links = [];
    const addedNodes = new Set();
    
    // Root Node
    nodes.push({
      id: 'root',
      name: 'Root Project',
      val: 20,
      color: '#FCD535',
      type: 'root'
    });
    addedNodes.add('root');

    dependencies.forEach(dep => {
      const nodeId = dep.id;
      if (!addedNodes.has(nodeId)) {
         addedNodes.add(nodeId);
         
         let color = '#0ECB81'; // Safe
         if (dep.risk === 'CRITICAL' || dep.risk === 'HIGH') color = '#F6465D';
         else if (dep.risk === 'MEDIUM') color = '#FCD535';
         
         nodes.push({ 
           id: nodeId, 
           name: nodeId.split('@')[0], // Clean name
           val: 10,
           color: color,
           risk: dep.risk
         });
      }
      
      const edgeId = `edge-root-${nodeId}`;
      links.push({
        source: 'root',
        target: nodeId,
        id: edgeId
      });
    });
    
    return { nodes, links };
  }, [dependencies]);

  const fgRef = useRef();

  useEffect(() => {
    // Zoom out slightly to fit
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 100);
    }
  }, [graphData]);

  // Custom rendering for nodes
  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

    ctx.fillStyle = 'rgba(11, 14, 17, 0.8)';
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = node.color;
    ctx.fillText(label, node.x, node.y);

    node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[500px] bg-canvas-dark rounded-xl border border-hairline-on-dark overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeCanvasObject={paintNode}
        linkColor={() => 'rgba(234, 236, 239, 0.1)'}
        linkWidth={1.5}
        d3VelocityDecay={0.3} // Obsidian-like bouncy physics
        d3AlphaDecay={0.01} // Continuous movement
        cooldownTicks={Infinity} // Keep physics alive
      />
      
      <div className="absolute bottom-4 left-4 z-20 flex gap-4 text-xs text-muted-strong bg-surface-elevated-dark p-3 rounded-lg border border-hairline-on-dark shadow-xl">
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0ECB81]"></div> Safe</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> Medium</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-trading-down"></div> High/Critical</div>
      </div>
    </div>
  );
}
