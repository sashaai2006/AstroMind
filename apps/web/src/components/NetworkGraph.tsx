"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Agent, Task, FileArtifact } from '@/hooks/useProjectSocket';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="text-slate-500 text-sm animate-pulse">Initializing Neural Network...</div>
});

type NetworkGraphProps = {
  projectId: string;
  agents: Agent[];
  tasks: Task[];
  files: FileArtifact[];
};

export default function NetworkGraph({ projectId, agents, tasks, files }: NetworkGraphProps) {
  const [data, setData] = useState({ nodes: [], links: [] });
  const fgRef = useRef<any>();

  // Theme Colors
  const colors = {
    nexus: '#6c63ff',
    agent: '#ff62d9',
    taskActive: '#00c2ff',
    taskDone: '#2dd4bf',
    taskPending: '#4b5563',
    file: '#fcd34d',
    link: 'rgba(255, 255, 255, 0.15)',
    text: 'rgba(255, 255, 255, 0.9)'
  };

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label;
    const fontSize = 12 / globalScale;
    const radius = node.val ? node.val / 2.5 : 5;

    // Glow
    ctx.shadowColor = node.color;
    ctx.shadowBlur = 25;
    
    // Core
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fill();

    // Inner ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1 / globalScale;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.7, 0, 2 * Math.PI, false);
    ctx.stroke();

    // Text Background (Glass pill)
    const textWidth = ctx.measureText(label).width;
    const bkgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5);
    
    if (globalScale > 0.8) { // Only show text when zoomed in a bit
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(node.x - bkgDimensions[0] / 2, node.y + radius + 2, bkgDimensions[0], bkgDimensions[1]);
        
        ctx.fillStyle = colors.text;
        ctx.font = `${fontSize}px 'Space Grotesk', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y + radius + 2 + bkgDimensions[1]/2);
    }
  }, []);

  useEffect(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // 1. Nexus (Project Center)
    nodes.push({ 
        id: 'project', 
        label: 'NEXUS', 
        group: 'project', 
        color: colors.nexus, 
        val: 40 
    });

    // 2. Agents
    agents.forEach(agent => {
      nodes.push({ 
          id: agent.role, 
          label: agent.role, 
          group: 'agent', 
          color: colors.agent, 
          val: 20 
      });
      links.push({ source: 'project', target: agent.role, color: colors.link }); 
    });

    // 3. Tasks
    tasks.forEach(task => {
      let color = colors.taskPending;
      if (task.status === 'completed') color = colors.taskDone;
      if (task.status === 'in_progress') color = colors.taskActive;

      nodes.push({ 
          id: task.id, 
          label: task.description.substring(0, 15) + '...',
          fullLabel: task.description, 
          group: 'task', 
          color: color,
          val: 12 
      });
      
      if (task.assigned_to) {
        links.push({ 
            source: task.assigned_to, 
            target: task.id, 
            color: colors.link,
            particles: task.status === 'in_progress' ? 4 : 0,
            particleColor: colors.taskActive
        });
      }
    });

    // 4. Files
    files.forEach(file => {
        nodes.push({ 
            id: file.name, 
            label: file.name, 
            group: 'file', 
            color: colors.file, 
            val: 10 
        });
        
        if (file.task_id) {
            links.push({ source: file.task_id, target: file.name, color: colors.link });
        } else {
            links.push({ source: 'project', target: file.name, color: colors.link });
        }
    });

    setData({ nodes, links });

  }, [projectId, agents, tasks, files]);

  return (
    <div className="w-full h-full relative overflow-hidden">
        <ForceGraph2D
            ref={fgRef}
            width={800} 
            height={600}
            graphData={data}
            
            // Physics
            d3AlphaDecay={0.02} 
            d3VelocityDecay={0.1}
            cooldownTicks={100}
            onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
            
            // Rendering
            nodeCanvasObject={paintNode}
            
            // Links
            linkColor={(link: any) => link.color}
            linkWidth={1.5}
            linkDirectionalParticles={(link: any) => link.particles || 0}
            linkDirectionalParticleSpeed={0.008}
            linkDirectionalParticleWidth={3}
            linkDirectionalParticleColor={(link: any) => link.particleColor || '#ffffff'}
            
            // Background (Transparent to show global CSS background)
            backgroundColor="rgba(0,0,0,0)" 
        />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 text-[10px] font-mono glass-panel p-3 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: colors.nexus, boxShadow: `0 0 10px ${colors.nexus}`}}></span> NEXUS CORE</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: colors.agent, boxShadow: `0 0 10px ${colors.agent}`}}></span> AGENTS</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: colors.taskActive, boxShadow: `0 0 10px ${colors.taskActive}`}}></span> ACTIVE TASK</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor: colors.file, boxShadow: `0 0 10px ${colors.file}`}}></span> ARTIFACTS</div>
        </div>
    </div>
  );
}
