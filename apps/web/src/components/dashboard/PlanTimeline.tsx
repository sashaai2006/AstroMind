"use client";

import { Layers, CheckCircle2, Circle, Loader2, ArrowDown } from "lucide-react";
import { Task } from "@/hooks/useProjectSocket";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  tasks: Task[];
  progress: number;
  isLoading?: boolean;
};

export function PlanTimeline({ tasks, progress, isLoading }: Props) {
  return (
    <div className="glass-panel rounded-3xl p-5 shadow-2xl flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 z-10">
        <h2 className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" /> Execution Protocol
        </h2>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {Math.round(progress)}% COMPLETE
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden mb-8 relative z-10">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/40 animate-shimmer w-full" />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0 relative overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4 z-10">
        {/* Connecting Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/50 via-slate-800 to-transparent" />
        
        {isLoading ? (
           <div className="space-y-6 pl-8 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="relative">
                       <Skeleton className="absolute -left-7 top-1 w-3.5 h-3.5 rounded-full" />
                       <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
              ))}
           </div>
        ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-xs font-mono">
                AWAITING MISSION PARAMETERS
            </div>
        ) : (
            tasks.map((task, idx) => (
            <div key={task.id} className="relative pl-8 py-3 group first:pt-0">
                {/* Node */}
                <div
                className={`absolute left-[5px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-all z-10 flex items-center justify-center ${
                    task.status === "completed"
                    ? "border-emerald-500 bg-black shadow-[0_0_10px_#10b981]"
                    : task.status === "in_progress"
                    ? "border-indigo-500 bg-black animate-pulse-glow shadow-[0_0_15px_#6366f1]"
                    : "border-slate-800 bg-black"
                }`}
                >
                    {task.status === "completed" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {task.status === "in_progress" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
                </div>

                {/* Content */}
                <div
                className={`text-xs transition-all p-3 rounded-xl border backdrop-blur-sm ${
                    task.status === "in_progress"
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.1)] translate-x-1"
                    : task.status === "completed"
                    ? "bg-white/5 border-white/5 text-slate-400"
                    : "border-transparent text-slate-500 group-hover:text-slate-300"
                }`}
                >
                    <div className="font-medium leading-relaxed">
                        {task.description}
                    </div>
                    {task.assigned_to && (
                        <div className="mt-2 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold opacity-70">
                             <span className="w-1 h-1 rounded-full bg-current" />
                             {task.assigned_to}
                        </div>
                    )}
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
}
