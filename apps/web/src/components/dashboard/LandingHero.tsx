"use client";

import { Loader2, Sparkles, Clock, ArrowRight, Zap } from "lucide-react";

type ProjectSummary = {
  id: string;
  description: string;
  created_at: number;
};

type Props = {
  idea: string;
  setIdea: (value: string) => void;
  isStarting: boolean;
  onStart: () => void;
  recentProjects: ProjectSummary[];
  onSelectProject: (id: string) => void;
};

export function LandingHero({ idea, setIdea, isStarting, onStart, recentProjects, onSelectProject }: Props) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-8 max-w-4xl w-full">
        <div className="space-y-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-[100px] opacity-20 rounded-full pointer-events-none" />
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl leading-[1.1]">
            THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient">HIVE</span>
            <br />
            AWAITS.
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light">
            Deploy an autonomous swarm of AI agents to build your software in seconds.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onStart()}
              placeholder="Describe your dream app..."
              className="flex-1 bg-transparent border-none text-white px-6 py-4 text-xl focus:outline-none placeholder:text-slate-600 font-light"
            />
            <button
              onClick={onStart}
              disabled={!idea || isStarting}
              className="neon-button px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              GENERATE
            </button>
          </div>
        </div>

        {recentProjects.length > 0 && (
          <div className="mt-24 text-left w-full max-w-5xl mx-auto">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ml-1">
              <Clock className="w-3 h-3" /> Recent Creations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="text-left group glass-panel border border-white/5 p-6 rounded-2xl hover:border-blue-500/30 transition-all flex flex-col gap-4 backdrop-blur-sm hover:-translate-y-1 duration-300"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="min-h-[64px]">
                    <div className="text-slate-100 font-bold text-lg truncate group-hover:text-blue-300 transition-colors">{project.description}</div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">ID: {project.id.substring(0, 8)}</div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                    <span>Restored from memory</span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

