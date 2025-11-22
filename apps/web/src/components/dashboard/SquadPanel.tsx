"use client";

import { User, Bot, Sparkles, Zap } from "lucide-react";
import { Agent } from "@/hooks/useProjectSocket";

type Props = {
  agents: Agent[];
};

export function SquadPanel({ agents }: Props) {
  return (
    <div className="glass-panel rounded-3xl p-5 shadow-2xl flex flex-col min-h-[30%] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
        <Sparkles className="w-24 h-24 text-indigo-500 blur-xl" />
      </div>

      <h2 className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 z-10">
        <User className="w-3.5 h-3.5" /> Neural Squad
      </h2>

      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 relative z-10">
        {agents.length === 0 ? (
             <div className="text-center py-10 text-slate-600 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                NO ACTIVE AGENTS
             </div>
        ) : (
            agents.map((agent, index) => (
            <div key={`${agent.role}-${index}`} className="group relative flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-inner group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-shadow">
                <Bot className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate group-hover:text-white tracking-wide">{agent.role}</div>
                <div className="text-[9px] text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    ONLINE
                </div>
                </div>

                {/* Status Icon */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400/50" />
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
}
