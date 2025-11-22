"use client";

import { useEffect, useState } from "react";
import { Search, FileCode, Play, RefreshCw, LogOut, Command } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CommandPalette({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Actions
  const actions = [
    { icon: <Play className="w-4 h-4" />, label: "Start New Project", shortcut: "N" },
    { icon: <FileCode className="w-4 h-4" />, label: "Open File...", shortcut: "O" },
    { icon: <RefreshCw className="w-4 h-4" />, label: "Restart Agents", shortcut: "R" },
    { icon: <LogOut className="w-4 h-4" />, label: "Exit Project", shortcut: "Esc" },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  // Key Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose(); // Toggle logic usually handled by parent, but here we assume open
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelectedIndex(i => (i + 1) % filtered.length);
      if (e.key === 'ArrowUp') setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
      if (e.key === 'Enter') {
        // Execute action
        console.log("Execute:", filtered[selectedIndex]?.label);
        onClose();
      }
    };

    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#18181b] border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Search Input */}
        <div className="flex items-center border-b border-zinc-800 px-4 py-3">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            autoFocus
            className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          />
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">Esc</span>
        </div>

        {/* Results */}
        <div className="py-2 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">No results found.</div>
          ) : (
            filtered.map((action, i) => (
              <div
                key={action.label}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                  i === selectedIndex ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
                onClick={() => { console.log(action.label); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div className="flex items-center gap-3">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
                {action.shortcut && (
                  <span className={`text-xs ${i === selectedIndex ? "text-blue-200" : "text-zinc-600"}`}>
                    {action.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/50 border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-500 flex items-center justify-between">
          <span>Pro Tip: Use arrow keys to navigate</span>
          <div className="flex gap-2">
            <span>Gangai v7.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

