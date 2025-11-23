"use client";

import Editor from "@monaco-editor/react";
import { FileCode, Loader2, Download, Code2, FileJson, Compass } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { FileArtifact, Task, Agent } from "@/hooks/useProjectSocket";
import NetworkGraph from "@/components/NetworkGraph";
import { AgentInspector } from "@/components/dashboard/AgentInspector";

type GraphApi = {
  zoomToFit: () => void;
  focusOnNode: (id?: string) => void;
};

type Props = {
  viewMode: "code" | "graph";
  files: FileArtifact[];
  activeFile: FileArtifact | null;
  setActiveFile: (file: FileArtifact) => void;
  onDownload: (e: React.MouseEvent, filename: string) => void;
  projectId: string;
  agents: Agent[];
  tasks: Task[];
  graphFocus?: boolean;
  onExitGraph?: () => void;
};

export function Viewport({
  viewMode,
  files,
  activeFile,
  setActiveFile,
  onDownload,
  projectId,
  agents,
  tasks,
  graphFocus = false,
  onExitGraph,
}: Props) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const graphApiRef = useRef<GraphApi | null>(null);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "in_progress").length, [tasks]);
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending").length, [tasks]);

  const editorLanguage = useMemo(() => {
    if (!activeFile) return "python";
    if (activeFile.name.endsWith(".html")) return "html";
    if (activeFile.name.endsWith(".css")) return "css";
    if (activeFile.name.endsWith(".js")) return "javascript";
    if (activeFile.name.endsWith(".json")) return "json";
    return "python";
  }, [activeFile]);

  const containerBase = graphFocus && viewMode === "graph"
    ? "flex-1 flex flex-col h-full w-full relative"
    : "glass-panel rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative h-full w-full border-none ring-1 ring-white/10";

  return (
    <div className={containerBase}>
      {/* Viewport Header/Tabs */}
      {viewMode === "code" && (
        <div className="h-12 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-2 gap-1 overflow-x-auto no-scrollbar z-20">
            {/* Decorative Dots */}
            <div className="flex gap-1.5 px-4 border-r border-white/5 mr-2 h-full items-center opacity-30">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>

          {files.length === 0 ? (
            <div className="px-4 text-xs text-slate-500 font-mono flex items-center gap-3 animate-pulse w-full">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> 
              <span className="uppercase tracking-widest text-[10px]">Initializing Data Stream...</span>
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file)}
                className={`group relative h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition-all min-w-fit border border-transparent ${
                  activeFile?.name === file.name 
                    ? "bg-white/10 text-white border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {file.name.endsWith('.json') ? (
                    <FileJson className={`w-3.5 h-3.5 ${activeFile?.name === file.name ? 'text-yellow-400' : 'text-slate-600'}`} />
                ) : (
                    <FileCode className={`w-3.5 h-3.5 ${activeFile?.name === file.name ? 'text-indigo-400' : 'text-slate-600'}`} />
                )}
                
                <span className="font-mono">{file.name}</span>
                
                {/* Hover Actions */}
                {activeFile?.name === file.name && (
                  <div className="ml-2 pl-2 border-l border-white/10 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <div 
                        onClick={(e) => onDownload(e, file.name)}
                        className="p-1 hover:bg-white/20 rounded-md cursor-pointer text-slate-400 hover:text-white transition-colors"
                        title="Download Artifact"
                      >
                          <Download className="w-3 h-3" />
                      </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Content Area */}
      <div className={`flex-1 relative ${graphFocus && viewMode === "graph" ? "bg-transparent" : "bg-[#05050a]"}`}>
        {viewMode === "code" ? (
          activeFile ? (
            <Editor
              height="100%"
              defaultLanguage="python"
              language={editorLanguage}
              theme="vs-dark"
              value={activeFile.content}
              options={{
                readOnly: true,
                minimap: { enabled: false }, // Clean look
                fontSize: 14,
                lineHeight: 24,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 24, bottom: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "phase",
                cursorStyle: "block",
                renderLineHighlight: "all", // Highlight current line
                contextmenu: false,
                scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    useShadows: false
                }
              }}
              // We can customize the theme via the onMount prop if needed for perfectly matching colors
              beforeMount={(monaco) => {
                  monaco.editor.defineTheme('cosmic-dark', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [],
                      colors: {
                          'editor.background': '#05050a', // Match container
                          'editor.lineHighlightBackground': '#ffffff05',
                          'editorLineNumber.foreground': '#334155',
                      }
                  });
              }}
              onMount={(editor, monaco) => {
                  monaco.editor.setTheme('cosmic-dark');
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse-slow" />
                <Code2 className="w-24 h-24 relative z-10 opacity-20 text-indigo-300" />
              </div>
              <p className="text-sm font-mono tracking-[0.2em] mt-8 uppercase text-slate-500">Awaiting Data Selection</p>
            </div>
          )
        ) : (
          <div className={`w-full h-full ${graphFocus ? "bg-gradient-to-br from-[#020617] via-[#04021a] to-[#01000f]" : "bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-80"} relative`}>
              {!graphFocus && (
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#05050a] pointer-events-none" />
              )}
              
              <NetworkGraph 
                 projectId={projectId} 
                 agents={agents} 
                 tasks={tasks} 
                 files={files} 
                 onAgentSelect={(agent) => setSelectedAgent(agent)}
                 onInit={(api) => { graphApiRef.current = api; }}
              />

              {graphFocus && onExitGraph && (
                <div className="absolute top-6 right-6 z-30">
                    <button
                      onClick={onExitGraph}
                      className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-slate-200 transition"
                    >
                      Exit Graph
                    </button>
                </div>
              )}

              {selectedAgent && (
                 <AgentInspector agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
              )}

              {graphFocus && (
                <>
                  <div className="absolute top-6 left-6 z-30 glass-panel rounded-2xl border border-white/10 px-6 py-4 backdrop-blur-xl">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Mission Status</p>
                    <div className="mt-2 flex gap-6 text-sm font-semibold">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500">Agents</span>
                        <span className="text-xl text-white">{agents.length}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500">Active Tasks</span>
                        <span className="text-xl text-amber-300">{activeTasks}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500">Artifacts</span>
                        <span className="text-xl text-cyan-300">{files.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
                    <button
                      onClick={() => graphApiRef.current?.zoomToFit()}
                      className="px-6 py-3 rounded-full bg-white text-black text-xs font-semibold uppercase tracking-widest shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4" />
                      Re-center Graph
                    </button>
                    <div className="glass-panel rounded-2xl border border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-slate-400">
                      Pending: <span className="text-white">{pendingTasks}</span>
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
