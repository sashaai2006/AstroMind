import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

export type Step = {
  id: string;
  name: string;
  agent: string;
  status: string;
  parallel_group?: string | null;
};

type Props = {
  steps: Step[];
};

const statusColors: Record<string, string> = {
  pending: "#facc15", // Yellow
  running: "#60a5fa", // Blue
  failed: "#ef4444",  // Red
  done: "#4ade80",    // Green
};

const statusGlows: Record<string, string> = {
  pending: "0 0 15px rgba(250, 204, 21, 0.6)",
  running: "0 0 20px rgba(96, 165, 250, 0.8)",
  failed: "0 0 20px rgba(239, 68, 68, 0.8)",
  done: "0 0 15px rgba(74, 222, 128, 0.6)",
};

const DAGView: React.FC<Props> = ({ steps }) => {
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];
    
    // CEO node at the top (command center)
    result.push({
      id: "ceo-node",
      data: { 
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5em', marginBottom: '4px' }}>👑</div>
            <div style={{ fontSize: '1.1em', fontWeight: 'bold' }}>CEO</div>
            <div style={{ fontSize: '0.7em', opacity: 0.7 }}>Command Center</div>
          </div>
        ) 
      },
      position: { x: 250, y: 0 },
      style: {
        background: "linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)",
        backdropFilter: "blur(10px)",
        color: "#fff",
        border: "3px solid #a855f7",
        padding: "1.2rem",
        borderRadius: "50%",
        width: 160,
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 30px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(255,255,255,0.1)",
        fontWeight: "bold",
      },
    });

    // Developer steps below CEO - vertical layout
    const centerX = 250;
    const startY = 220;
    const verticalGap = 180;
    
    // Group steps by parallel_group
    const groups: Map<string, Step[]> = new Map();
    steps.forEach((step) => {
      const group = step.parallel_group || step.id;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(step);
    });

    let currentY = startY;
    let nodeIndex = 0;
    
    groups.forEach((groupSteps, groupId) => {
      const groupWidth = groupSteps.length * 200;
      const startX = centerX - groupWidth / 2 + 100;
      
      groupSteps.forEach((step, idx) => {
        result.push({
          id: step.id,
          data: { 
            label: (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '4px' }}>{step.name}</div>
                <div style={{ fontSize: '0.75em', opacity: 0.8, textTransform: 'uppercase' }}>{step.agent}</div>
                <div style={{ 
                  fontSize: '0.65em', 
                  marginTop: '6px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: statusColors[step.status] || "#555",
                  color: '#000',
                  fontWeight: 'bold'
                }}>
                  {step.status.toUpperCase()}
                </div>
              </div>
            ) 
          },
          position: { x: startX + idx * 200, y: currentY },
          style: {
            background: "rgba(20, 20, 35, 0.9)",
            backdropFilter: "blur(5px)",
            color: "#e0e0e0",
            border: `2px solid ${statusColors[step.status] || "#555"}`,
            padding: "1rem",
            borderRadius: "16px",
            width: 150,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: statusGlows[step.status] || "none",
            transition: "all 0.3s ease",
          },
        });
        nodeIndex++;
      });
      
      currentY += verticalGap;
    });

    return result;
  }, [steps]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    
    // Connect CEO to all first-level steps
    const groups: Map<string, Step[]> = new Map();
    steps.forEach((step) => {
      const group = step.parallel_group || step.id;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(step);
    });
    
    const groupsArray = Array.from(groups.values());
    
    // CEO -> first group
    if (groupsArray.length > 0) {
      groupsArray[0].forEach((step) => {
        result.push({
          id: `ceo->${step.id}`,
          source: "ceo-node",
          target: step.id,
          animated: true,
          style: { 
            stroke: "#a855f7", 
            strokeWidth: 3, 
            filter: "drop-shadow(0 0 5px #a855f7)" 
          },
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#a855f7",
          },
        });
      });
    }
    
    // Connect groups sequentially
    for (let i = 0; i < groupsArray.length - 1; i++) {
      const currentGroup = groupsArray[i];
      const nextGroup = groupsArray[i + 1];
      
      // Connect last of current to first of next (or all to all for parallel)
      currentGroup.forEach((currentStep) => {
        nextGroup.forEach((nextStep) => {
          result.push({
            id: `${currentStep.id}->${nextStep.id}`,
            source: currentStep.id,
            target: nextStep.id,
            animated: true,
            style: { 
              stroke: "#60a5fa", 
              strokeWidth: 2, 
              filter: "drop-shadow(0 0 3px #60a5fa)" 
            },
            type: "smoothstep",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#60a5fa",
            },
          });
        });
      });
    }

    return result;
  }, [steps]);

  return (
    <div style={{ height: "100%", minHeight: "400px", background: "transparent", borderRadius: "8px", overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap 
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #333" }} 
          nodeColor={(n) => {
            if (n.id === "ceo-node") return "#a855f7";
            const style = n.style as any;
            return style?.borderColor || "#555";
          }}
        />
        <Controls style={{ buttonBg: "#222", buttonColor: "#eee", buttonBorder: "1px solid #444" }} />
        <Background color="#444" gap={20} size={1} style={{ opacity: 0.3 }} />
      </ReactFlow>
    </div>
  );
};

export default DAGView;
