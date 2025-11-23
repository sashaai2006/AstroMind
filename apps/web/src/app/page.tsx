"use client";

import { useState, useEffect, useRef } from "react";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import { LandingHero } from "@/components/dashboard/LandingHero";
import { Viewport } from "@/components/dashboard/Viewport";
import { TerminalPanel } from "@/components/layout/TerminalPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { SquadPanel } from "@/components/dashboard/SquadPanel";
import { PlanTimeline } from "@/components/dashboard/PlanTimeline";
import { CommandPalette } from "@/components/layout/CommandPalette";

type ProjectSummary = {
  id: string;
  description: string;
  created_at: number;
};

export default function Home() {
  const [idea, setIdea] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState("files"); // 'files', 'graph', 'settings'
  const [showTerminal, setShowTerminal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasUnreadLogs, setHasUnreadLogs] = useState(false);
  
  // Data State
  const { isConnected, logs, agents, tasks, files, activeFile, setActiveFile, isLoading } = useProjectSocket(projectId);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Track unread logs
  useEffect(() => {
      if (!showTerminal && logs.length > 0) {
          setHasUnreadLogs(true);
      }
  }, [logs, showTerminal]);

  // Clear unread logs when terminal is opened
  useEffect(() => {
      if (showTerminal) {
          setHasUnreadLogs(false);
      }
  }, [showTerminal]);

  // Fetch Recent Projects
  useEffect(() => {
    fetch("http://localhost:8000/projects")
        .then(res => res.json())
        .then(data => setRecentProjects(data))
        .catch(console.error);
  }, [projectId]); // Refetch when new project created

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowPalette(prev => !prev);
      }
      if (e.key === '`' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
         e.preventDefault();
         setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const startProject = async () => {
    if (!idea) return;
    setIsStarting(true);
    setProjectId(null);
    setActiveTab("graph"); // Switch to graph view for new projects to see agents spawning

    try {
      const res = await fetch("http://localhost:8000/projects/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      setProjectId(data.project_id);
      // setShowTerminal(true); // Disable auto-open
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDownload = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    if (!projectId) return;
    window.open(`http://localhost:8000/files/${projectId}/${filename}`, '_blank');
  };

  const showDashboard = !!projectId;
  const isGraphFocus = showDashboard && activeTab === "graph";
  
  // Progress Calculation
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const renderCommandPalette = () => {
    if (!showPalette) return null;
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
        onClick={() => setShowPalette(false)}
      >
        <CommandPalette
          onClose={() => setShowPalette(false)}
          files={files}
          onSelectFile={setActiveFile}
          onStartProject={startProject}
          onSelectProject={(id) => setProjectId(id)}
          recentProjects={recentProjects}
          onToggleTerminal={() => setShowTerminal(!showTerminal)}
          onToggleViewMode={() => setActiveTab(activeTab === "code" ? "graph" : "code")}
        />
      </div>
    );
  };

  if (!showDashboard) {
    return (
      <div className="flex h-screen w-full bg-cosmic text-slate-200 font-sans overflow-hidden relative selection:bg-indigo-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] animate-pulse-slow delay-1000" />
        </div>
        <div className="flex-1 flex flex-col relative h-full min-w-0 z-10">
          <LandingHero
            idea={idea}
            setIdea={setIdea}
            isStarting={isStarting}
            onStart={startProject}
            recentProjects={recentProjects}
            onSelectProject={(id) => setProjectId(id)}
          />
          {renderCommandPalette()}
        </div>
      </div>
    );
  }

  if (isGraphFocus) {
    return (
      <div className="relative h-screen w-full bg-gradient-to-br from-[#01000b] via-[#020217] to-[#03030c] text-slate-200 overflow-hidden font-sans">
        <Viewport
          viewMode="graph"
          files={files}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          onDownload={handleDownload}
          projectId={projectId!}
          agents={agents}
          tasks={tasks}
          graphFocus
          onExitGraph={() => setActiveTab("files")}
        />

        <div className="absolute top-6 left-6 flex gap-3 z-40">
          <button
            onClick={() => setShowTerminal(true)}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs uppercase tracking-widest hover:bg-white/20 transition"
          >
            Logs
          </button>
          <button
            onClick={() => setShowPalette(true)}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs uppercase tracking-widest hover:bg-white/20 transition"
          >
            Cmd ⌘K
          </button>
        </div>

        <TerminalPanel logs={logs} showTerminal={showTerminal} setShowTerminal={setShowTerminal} logsEndRef={logsEndRef} />
        {renderCommandPalette()}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-cosmic text-slate-200 font-sans overflow-hidden relative selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] animate-pulse-slow delay-1000" />
      </div>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        hasUnreadLogs={hasUnreadLogs}
      />

      <div className="flex-1 flex flex-col relative h-full min-w-0 z-10">
        <header className="h-12 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center px-6 justify-between shrink-0 z-20">
          <div className="flex items-center text-xs text-slate-500 font-mono gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:text-white transition-colors">
              <div className="w-5 h-5 flex flex-col justify-center gap-1">
                <div className="w-full h-px bg-current" />
                <div className="w-full h-px bg-current" />
                <div className="w-full h-px bg-current" />
              </div>
            </button>
            <span className="text-indigo-400 font-bold tracking-widest text-glow">ASTRAMIND</span>
            <span className="mx-2 opacity-30">/</span>
            <span className="text-slate-200 font-medium tracking-wide">{idea.substring(0, 40) || "NEW_MISSION"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-500 ${
                isConnected
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "Neural Link Active" : "Offline"}
            </div>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative p-4 gap-4">
          {(activeTab === "files" || activeTab === "code") && (
            <div className={`flex flex-col gap-4 shrink-0 animate-slide-in-left transition-all duration-300 ${sidebarOpen ? "w-80" : "w-0 opacity-0 overflow-hidden"}`}>
              <SquadPanel agents={agents} isLoading={isLoading} />
              <PlanTimeline tasks={tasks} progress={progress} isLoading={isLoading} />
            </div>
          )}

          <div className="flex-1 min-w-0 animate-fade-in">
            <Viewport
              viewMode={activeTab === "graph" ? "graph" : "code"}
              files={files}
              activeFile={activeFile}
              setActiveFile={setActiveFile}
              onDownload={handleDownload}
              projectId={projectId!}
              agents={agents}
              tasks={tasks}
            />
          </div>
        </main>
        <TerminalPanel logs={logs} showTerminal={showTerminal} setShowTerminal={setShowTerminal} logsEndRef={logsEndRef} />
        {renderCommandPalette()}
      </div>
    </div>
  );
}
