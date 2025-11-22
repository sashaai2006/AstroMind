"use client";

import { Cpu, Code2, Network } from "lucide-react";
import clsx from "clsx";

type Props = {
  showDashboard: boolean;
  isConnected: boolean;
  viewMode: "code" | "graph";
  onViewChange: (mode: "code" | "graph") => void;
  onLogoClick: () => void;
};

export function Navbar({ showDashboard, isConnected, viewMode, onViewChange, onLogoClick }: Props) {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl h-16 z-50 rounded-2xl glass-panel border border-white/10 shadow-2xl flex items-center px-6 justify-between">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={onLogoClick}>
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight text-white leading-none">
            HIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">PROTOCOL</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">Autonomous Swarm</span>
        </div>
      </div>

      {showDashboard && (
        <div className="hidden md:flex items-center bg-black/20 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => onViewChange("code")}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300",
              viewMode === "code" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Code2 className="w-4 h-4" /> CODE
          </button>
          <button
            onClick={() => onViewChange("graph")}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300",
              viewMode === "graph" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Network className="w-4 h-4" /> NEURAL NET
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <span
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
            isConnected ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-slate-700 bg-slate-800/50 text-slate-500"
          )}
        >
          <span className="relative flex h-2 w-2">
            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={clsx("relative inline-flex rounded-full h-2 w-2", isConnected ? "bg-green-500" : "bg-slate-500")} />
          </span>
          {isConnected ? "SYSTEM ONLINE" : "OFFLINE"}
        </span>
      </div>
    </header>
  );
}

