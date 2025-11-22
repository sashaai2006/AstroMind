"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, Activity } from "lucide-react";

type Props = {
  logs: string[];
  isOpen: boolean;
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  logsEndRef: React.RefObject<HTMLDivElement>;
};

export function TerminalPanel({ logs, showTerminal, setShowTerminal, logsEndRef }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Auto-scroll effect
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showTerminal]); // Scroll when logs update or terminal opens

  if (!showTerminal) return null;

  return (
    <div 
      className={`fixed bottom-0 right-0 flex flex-col transition-all duration-500 ease-spring z-40 
        ${isMaximized ? "top-0 left-0" : "left-20 h-80 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"}
        bg-[#030014]/95 backdrop-blur-xl
      `}
    >
      {/* Holographic Top Bar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-white/5 select-none">
        <div className="flex items-center gap-3 text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
          <Activity className="w-3 h-3 animate-pulse" /> 
          System Stream
          <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] border border-indigo-500/30">LIVE</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMaximized(!isMaximized)} 
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={() => setShowTerminal(false)} 
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs md:text-sm custom-scrollbar relative">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />
        
        <div className="space-y-1 pb-4">
            {logs.length === 0 && (
                <div className="text-slate-600 italic opacity-50 mt-4 text-center">
                    Waiting for neural link...
                </div>
            )}
            {logs.map((log, i) => (
            <div key={i} className="flex gap-4 group hover:bg-white/5 rounded px-2 py-0.5 transition-colors">
                <span className="text-slate-600 select-none w-8 text-right opacity-50 text-[10px] pt-0.5">{i+1}</span>
                <span className={`break-all tracking-wide ${
                log.includes('Error') ? 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]' : 
                log.includes('Success') || log.includes('Approved') ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 
                log.includes('Reviewer') ? 'text-purple-400' :
                log.includes('Worker') ? 'text-blue-400' :
                'text-slate-300'
                }`}>
                <span className="opacity-50 mr-2 text-[10px] uppercase">[{new Date().toLocaleTimeString()}]</span>
                {log}
                </span>
            </div>
            ))}
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
