"use client";

import { Loader2, Sparkles, Clock, Zap, ChevronRight, Terminal, LayoutTemplate } from "lucide-react";

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
    <main className="flex-1 flex flex-col items-center justify-center relative h-full w-full">
      
      {/* Deep Space Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl px-4 flex flex-col items-center z-10 -mt-10">
        
        {/* Greeting */}
        <h1 className="text-3xl md:text-4xl font-medium text-white text-center mb-10 tracking-tight">
            What will we build today?
        </h1>

        {/* Input Area (DeepSeek Style) */}
        <div className="w-full relative group">
          {/* Glowing border effect */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          
          <div className="relative bg-[#1e1e2e] border border-white/5 rounded-3xl p-4 shadow-2xl flex flex-col gap-2 transition-colors group-hover:border-white/10">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onStart();
                  }
              }}
              placeholder="Ask AstraMind to create..."
              className="w-full bg-transparent border-none text-white text-lg focus:outline-none placeholder:text-slate-500 font-light resize-none min-h-[56px] max-h-[200px] py-2 px-2"
              rows={1}
              autoFocus
            />
            
            <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-indigo-400 transition-colors" title="Add Context">
                        <LayoutTemplate className="w-5 h-5" />
                    </button>
                </div>
                
                <button
                  onClick={onStart}
                  disabled={!idea || isStarting}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      idea 
                      ? "bg-white text-black hover:bg-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
            <SuggestionChip 
                icon={<Terminal className="w-4 h-4" />} 
                label="Python Automation" 
                onClick={() => setIdea("Write a Python script to automate daily reports...")} 
            />
            <SuggestionChip 
                icon={<Zap className="w-4 h-4" />} 
                label="FastAPI Backend" 
                onClick={() => setIdea("Create a FastAPI backend with JWT auth...")} 
            />
            <SuggestionChip 
                icon={<LayoutTemplate className="w-4 h-4" />} 
                label="React Dashboard" 
                onClick={() => setIdea("Build a modern React dashboard with charts...")} 
            />
        </div>

      </div>

      {/* Recent Projects Footer (Minimalist) */}
      {recentProjects.length > 0 && (
          <div className="absolute bottom-6 w-full px-6 flex justify-center">
             <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar max-w-4xl mask-fade-right items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mr-2 shrink-0">Recent:</span>
                {recentProjects.slice(0, 3).map(project => (
                    <button 
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full px-4 py-2 transition-all group shrink-0"
                    >
                        <Clock className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                        <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate max-w-[150px]">{project.description}</span>
                    </button>
                ))}
             </div>
          </div>
      )}
    </main>
  );
}

function SuggestionChip({ icon, label, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e1e2e]/50 border border-white/5 hover:bg-[#27273a] hover:border-white/10 transition-all text-sm text-slate-400 hover:text-slate-200"
        >
            <span className="text-indigo-400 opacity-80">{icon}</span>
            {label}
        </button>
    )
}
