"use client";

import { Bot, X, Activity, BrainCircuit, Terminal } from "lucide-react";
import { Agent } from "@/hooks/useProjectSocket";

type Props = {
  agent: Agent;
  onClose: () => void;
};

export function AgentInspector({ agent, onClose }: Props) {
  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 glass-panel rounded-xl border border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right-10 z-30 bg-[#0a0a12]/90 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
             <Bot className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{agent.role}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
               <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
               </span>
               ACTIVE
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
         
         {/* Directives */}
         <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
               <BrainCircuit className="w-3 h-3" /> Core Directives
            </h4>
            <div className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 font-light">
               {agent.system_prompt || "No explicit directives found."}
            </div>
         </div>

         {/* Recent Activity (Placeholder for real events) */}
         <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
               <Activity className="w-3 h-3" /> Live Telemetry
            </h4>
            <div className="space-y-2">
                <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="text-indigo-400 font-mono">[10:04:23]</span>
                    <span>Analyzing task requirements...</span>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="text-indigo-400 font-mono">[10:04:25]</span>
                    <span>Accessing vector memory...</span>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="text-indigo-400 font-mono">[10:04:26]</span>
                    <span>Generating artifact...</span>
                </div>
            </div>
         </div>

         {/* Context (Placeholder) */}
         <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
               <Terminal className="w-3 h-3" /> Context Window
            </h4>
            <div className="h-24 bg-black/40 rounded-lg border border-white/5 p-2 font-mono text-[10px] text-slate-500 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                {`{
  "task_id": "task_123",
  "status": "processing",
  "memory_usage": "245MB",
  "tokens": 4096
}`}
            </div>
         </div>

      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-white/10 bg-black/20">
          <button className="w-full py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-600/40 transition-colors uppercase tracking-wider">
             Override Protocol
          </button>
      </div>
    </div>
  );
}

