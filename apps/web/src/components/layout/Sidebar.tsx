"use client";

import { 
  LayoutGrid, 
  Terminal as TerminalIcon, 
  GitGraph, 
  Settings, 
  Cpu, 
} from "lucide-react";

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleTerminal: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  hasUnreadLogs?: boolean;
};

export function Sidebar({ activeTab, setActiveTab, onToggleTerminal, sidebarOpen, setSidebarOpen, hasUnreadLogs }: SidebarProps) {
  return (
    <aside className={`flex flex-col items-center py-6 border-r border-white/10 glass-panel transition-all duration-300 z-50 relative ${
        sidebarOpen ? "w-20" : "w-0 -translate-x-full opacity-0 overflow-hidden"
    }`}>
      {/* Brand Nexus */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)] mb-10 cursor-pointer group relative overflow-hidden">
        <div className="absolute inset-0 bg-white/20 animate-pulse-slow rounded-2xl" />
        <Cpu className="w-6 h-6 text-white relative z-10 drop-shadow-lg" />
      </div>

      {/* Main Navigation */}
      <div className="flex flex-col gap-4 w-full px-3">
        <NavIcon 
          icon={<LayoutGrid />} 
          label="Dashboard" 
          active={activeTab === 'files' || activeTab === 'code'} 
          onClick={() => setActiveTab('files')} 
        />
        <NavIcon 
          icon={<GitGraph />} 
          label="Neural Graph" 
          active={activeTab === 'graph'} 
          onClick={() => setActiveTab('graph')} 
        />
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto flex flex-col gap-4 w-full px-3">
        <NavIcon 
          icon={<TerminalIcon />} 
          label="Terminal Protocol" 
          active={false} 
          onClick={onToggleTerminal} 
          isAction
          badge={hasUnreadLogs}
        />
        <NavIcon 
          icon={<Settings />} 
          label="System Config" 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
        />
      </div>
    </aside>
  );
}

function NavIcon({ icon, label, active, onClick, isAction, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 group relative ${
        active 
          ? "bg-gradient-to-br from-white/15 to-white/5 text-white border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
          : "text-slate-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
      } ${isAction ? "hover:text-cyan-400 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]" : ""}`}
    >
      {/* Icon Glow on Hover */}
      <div className="relative z-10 transform group-hover:scale-110 transition-transform">
        {icon}
      </div>
      
      {/* Badge for unread logs */}
      {badge && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-black animate-pulse z-20" />
      )}
      
      {/* Active Indicator */}
      {active && (
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full -z-10" />
      )}

      {/* Tooltip */}
      <span className="absolute left-full ml-4 bg-[#0f172a]/90 backdrop-blur-xl text-xs font-medium text-white px-3 py-1.5 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-[100] whitespace-nowrap">
        {label}
        {/* Little arrow */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-r-[#0f172a]/90" />
      </span>
    </button>
  );
}
