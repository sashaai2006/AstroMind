"use client";

import { Terminal, ChevronUp, ChevronDown } from "lucide-react";
import { MutableRefObject } from "react";

type Props = {
  logs: string[];
  showTerminal: boolean;
  toggle: () => void;
  logsEndRef: MutableRefObject<HTMLDivElement | null>;
};

export function TerminalPanel({ logs, showTerminal, toggle, logsEndRef }: Props) {
  return (
    <div
      className={`absolute bottom-4 left-4 right-4 glass-panel bg-[#05050f]/90 border border-white/10 rounded-xl shadow-2xl transition-all duration-500 ease-in-out overflow-hidden flex flex-col ${
        showTerminal ? "h-64" : "h-10"
      }`}
    >
      <button
        className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
        onClick={toggle}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5" />
          Neural Link Output
          {logs.length > 0 && !showTerminal && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </div>
        {showTerminal ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 text-slate-300">
        {logs.map((log, index) => (
          <div key={`${log}-${index}`} className="break-all flex gap-2">
            <span className="text-slate-600 select-none">{`>`}</span>
            <span className={log.includes("Error") ? "text-red-400" : log.includes("generated") ? "text-green-400 font-bold" : ""}>{log}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

