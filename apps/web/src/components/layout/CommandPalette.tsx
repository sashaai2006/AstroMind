"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, FileCode, Play, RefreshCw, LogOut, Command, Terminal, GitBranch } from "lucide-react";
import { FileArtifact } from "@/hooks/useProjectSocket";

type ProjectSummary = {
  id: string;
  description: string;
};

type Props = {
  onClose: () => void;
  files: FileArtifact[];
  onSelectFile: (file: FileArtifact) => void;
  onStartProject: () => Promise<void> | void;
  onSelectProject: (id: string) => void;
  recentProjects: ProjectSummary[];
  onToggleTerminal: () => void;
  onToggleViewMode: () => void;
};

type PaletteItem = {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
};

type PaletteSection = {
  title: string;
  items: PaletteItem[];
};

export function CommandPalette({
  onClose,
  files,
  onSelectFile,
  onStartProject,
  onSelectProject,
  recentProjects,
  onToggleTerminal,
  onToggleViewMode,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();

  const sections = useMemo<PaletteSection[]>(() => {
    const actionItems: PaletteItem[] = [
      {
        id: "action-start",
        label: "Start New Mission",
        subtitle: "Spin up fresh agent swarm",
        icon: <Play className="w-4 h-4 text-emerald-300" />,
        shortcut: "Enter",
        onSelect: () => void onStartProject(),
      },
      {
        id: "action-toggle-terminal",
        label: "Toggle Terminal",
        subtitle: "Show/Hide mission logs",
        icon: <Terminal className="w-4 h-4 text-cyan-300" />,
        shortcut: "⌘`",
        onSelect: onToggleTerminal,
      },
      {
        id: "action-toggle-view",
        label: "Toggle Graph / Code View",
        subtitle: "Switch primary viewport",
        icon: <Command className="w-4 h-4 text-indigo-300" />,
        shortcut: "⌘⌥G",
        onSelect: onToggleViewMode,
      },
      {
        id: "action-restart",
        label: "Restart Agents",
        subtitle: "Re-run current plan",
        icon: <RefreshCw className="w-4 h-4 text-amber-300" />,
        onSelect: () => console.log("Restart agents coming soon"),
      },
      {
        id: "action-exit",
        label: "Exit Project",
        subtitle: "Return to landing",
        icon: <LogOut className="w-4 h-4 text-rose-300" />,
        onSelect: () => window.location.reload(),
      },
    ];

    const fileItems: PaletteItem[] = files.slice(0, 20).map((file) => ({
      id: `file-${file.name}`,
      label: file.name,
      subtitle: "Artifact",
      icon: <FileCode className="w-4 h-4 text-slate-300" />,
      onSelect: () => onSelectFile(file),
    }));

    const projectItems: PaletteItem[] = recentProjects.slice(0, 10).map((project) => ({
      id: `project-${project.id}`,
      label: project.description || "Untitled mission",
      subtitle: project.id.slice(0, 8),
      icon: <GitBranch className="w-4 h-4 text-purple-300" />,
      onSelect: () => onSelectProject(project.id),
    }));

    const matchFilter = (item: PaletteItem) => {
      if (!normalizedQuery) return true;
      return (
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.subtitle?.toLowerCase().includes(normalizedQuery)
      );
    };

    return [
      { title: "Actions", items: actionItems.filter(matchFilter) },
      { title: "Files", items: fileItems.filter(matchFilter) },
      { title: "Recent Missions", items: projectItems.filter(matchFilter) },
    ].filter((section) => section.items.length > 0);
  }, [
    files,
    recentProjects,
    normalizedQuery,
    onSelectFile,
    onSelectProject,
    onStartProject,
    onToggleTerminal,
    onToggleViewMode,
  ]);

  const indexedSections = useMemo(() => {
    let counter = 0;
    return sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({ ...item, index: counter++ })),
    }));
  }, [sections]);

  const totalItems = indexedSections.reduce((sum, section) => sum + section.items.length, 0);

  useEffect(() => {
    if (totalItems === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > totalItems - 1) {
      setSelectedIndex(totalItems - 1);
    }
  }, [totalItems, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
      if (totalItems === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % totalItems);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((idx) => (idx - 1 + totalItems) % totalItems);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const activeItem = indexedSections.flatMap((s) => s.items).find((item) => item.index === selectedIndex);
        if (activeItem) {
          activeItem.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [indexedSections, onClose, selectedIndex, totalItems]);

  if (totalItems === 0 && !normalizedQuery) {
    // still render base actions; ensure at least one section exists
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0c0d16]/95 border border-white/10 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.65)] overflow-hidden animate-fade-in"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-white/5 px-5 py-4 gap-3">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            autoFocus
            className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-600 text-lg"
            placeholder="Command AstraMind..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/10">Esc</span>
        </div>

        {/* Results */}
        <div className="py-3 max-h-[360px] overflow-y-auto custom-scrollbar">
          {indexedSections.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-600 text-sm">No matches for “{query}”.</div>
          ) : (
            indexedSections.map((section) => (
              <div key={section.title} className="px-4 py-2">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 px-2">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onSelect();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(item.index)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition ${
                        item.index === selectedIndex
                          ? "bg-white/10 border border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                          : "text-slate-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="shrink-0">{item.icon}</span>
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                        </div>
                      </div>
                      {item.shortcut && (
                        <span className="text-[10px] uppercase tracking-widest text-slate-500">{item.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 px-6 py-3 text-[10px] text-slate-500 flex items-center justify-between uppercase tracking-[0.3em]">
          <span>Navigate with ↑ ↓</span>
          <span>AstraMind v1.0</span>
        </div>
      </div>
    </div>
  );
}
