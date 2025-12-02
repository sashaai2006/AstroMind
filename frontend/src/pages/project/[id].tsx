import { useRouter } from "next/router";
import { useCallback, useEffect, useState, useRef } from "react";
import FileTree, { FileEntry } from "../../components/FileTree";
import Editor from "../../components/Editor";
import ChatPanel, { Message } from "../../components/ChatPanel";
import DAGView, { Step } from "../../components/DAGView";
import LogPanel, { LogEvent } from "../../components/LogPanel";
import { soundManager } from "../../utils/sound";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace("http", "ws");

const languageFromPath = (path: string) => {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
};

export default function ProjectPage() {
  const router = useRouter();
  const { id } = router.query;
  const projectId = id as string | undefined;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [version, setVersion] = useState<number>(1);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"editor" | "dag">("editor");
  
  // Refs to access latest state in WS callback without re-subscribing
  const selectedFileRef = useRef(selectedFile);
  useEffect(() => { selectedFileRef.current = selectedFile; }, [selectedFile]);

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/files`);
    if (response.ok) {
      setFiles(await response.json());
    }
  }, [projectId]);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/status`);
    if (response.ok) {
      const data = await response.json();
      setSteps(data.steps);
      setStatus(data.status);
    }
  }, [projectId]);

  const fetchFileContent = useCallback(
    async (path: string, versionOverride?: number) => {
      if (!projectId) return;
      const versionToUse = versionOverride ?? version;
      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/file?path=${encodeURIComponent(path)}&version=${versionToUse}`,
      );
      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      }
    },
    [projectId, version],
  );

  useEffect(() => {
    fetchFiles();
    fetchStatus();
  }, [fetchFiles, fetchStatus]);

  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile);
    }
  }, [selectedFile, fetchFileContent, version]);

  useEffect(() => {
    if (!projectId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/projects/${projectId}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "event") {
          setLogs((prev) => [...prev.slice(-199), data]);
          fetchStatus();
          if (data.artifact_path) {
            fetchFiles();
            soundManager.playSuccess();
            if (selectedFileRef.current && data.artifact_path === selectedFileRef.current) {
                 fetchFileContent(selectedFileRef.current);
            }
          }
        }
      } catch {
        // ignore malformed events
      }
    };
    return () => ws.close();
  }, [projectId, fetchStatus, fetchFiles, fetchFileContent]);

  const handleSave = async (content: string) => {
    if (!projectId || !selectedFile) return;
    soundManager.playClick();
    await fetch(`${API_BASE}/api/projects/${projectId}/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile, content }),
    });
    await fetchFiles();
  };

  const handleChat = async (message: string, history: Message[]) => {
    if (!projectId) return "Error: No project ID";
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!response.ok) {
      throw new Error("Failed to send message");
    }
    const data = await response.json();
    fetchFiles();
    return data.response;
  };

  // Handle auto-fix request
  const handleFix = async () => {
    if (!selectedFile || !fileContent) return;
    
    const prompt = `I am having trouble with this file: ${selectedFile}.\n\nContent:\n${fileContent}\n\nPlease analyze it for errors (syntax, logic, or best practices) and fix them. Return the corrected file content.`;
    
    soundManager.playClick();
    
    try {
        const history: Message[] = [{ role: "user", content: prompt }];
        await handleChat(prompt, history);
        soundManager.playSuccess();
    } catch (e) {
        console.error(e);
    }
  };

  // Handle Deep Review request
  const handleDeepReview = async () => {
    if (!projectId || !selectedFile) return;
    
    soundManager.playClick();
    
    try {
        const response = await fetch(`${API_BASE}/api/projects/${projectId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: [selectedFile] }),
        });
        
        if (response.ok) {
            const result = await response.json();
            soundManager.playSuccess();
            
            // Show result in alert (could be improved with a modal)
            if (result.approved) {
                alert(`✅ Code Approved!\n\nNo critical issues found.`);
            } else {
                alert(`⚠️ Review Comments:\n\n${result.comments.join('\n\n')}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
  };

  const downloadHref = projectId
    ? `${API_BASE}/api/projects/${projectId}/download?version=${version}`
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", color: "#e0e0e0" }}>
      <header style={{ padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, letterSpacing: "1px", background: "linear-gradient(90deg, #fff, #aaa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AstraMind / {projectId}</h1>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>Status: <span style={{ color: status === "done" ? "#4ade80" : "#facc15", fontWeight: "bold" }}>{status.toUpperCase()}</span></p>
        </div>
        <div>
           <a href="/" style={{ fontSize: "0.9rem", color: "#60a5fa", display: "flex", alignItems: "center", gap: "4px" }}>
             <span>←</span> Back to Home
           </a>
        </div>
      </header>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "250px 1fr", overflow: "hidden", padding: "1rem", gap: "1rem" }}>
        <FileTree
          files={files}
          selectedPath={selectedFile}
          onSelect={(path) => { setSelectedFile(path); soundManager.playHover(); }}
          version={version}
          onVersionChange={setVersion}
          onRefresh={fetchFiles}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
            <button
              onClick={() => { setActiveTab("editor"); soundManager.playHover(); }}
              style={{
                background: activeTab === "editor" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                color: activeTab === "editor" ? "#60a5fa" : "#9ca3af",
                border: activeTab === "editor" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
                marginRight: "0.5rem",
                boxShadow: "none"
              }}
            >
              Code Editor
            </button>
            <button
              onClick={() => { setActiveTab("dag"); soundManager.playHover(); }}
              style={{
                background: activeTab === "dag" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                color: activeTab === "dag" ? "#60a5fa" : "#9ca3af",
                border: activeTab === "dag" ? "1px solid rgba(59, 130, 246, 0.5)" : "1px solid transparent",
                boxShadow: "none"
              }}
            >
              Execution Graph
            </button>
          </div>

          {activeTab === "editor" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1rem", height: "calc(100vh - 140px)", overflow: "hidden" }}>
              <div style={{ height: "100%", overflow: "hidden" }}>
                  <Editor
                    path={selectedFile}
                    content={fileContent}
                    language={selectedFile ? languageFromPath(selectedFile) : "plaintext"}
                    onSave={handleSave}
                    onFix={handleFix}
                    onDeepReview={handleDeepReview}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ flex: 1, minHeight: "300px", display: "flex", flexDirection: "column" }}>
                     <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem 0", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "1px" }}>AI Assistant</h3>
                     <ChatPanel onSendMessage={handleChat} />
                  </div>
                  
                  <div className="glass-panel" style={{ padding: "1rem", borderRadius: "8px" }}>
                    <h3 style={{ marginTop: 0, fontSize: "0.9rem", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "1px" }}>Actions</h3>
                    <div style={{ marginTop: "0.5rem" }}>
                      <a
                        href={downloadHref || "#"}
                        style={{ 
                          display: "block", 
                          textAlign: "center",
                          padding: "0.6rem",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "white",
                          borderRadius: "6px",
                          pointerEvents: downloadHref ? "auto" : "none", 
                          opacity: downloadHref ? 1 : 0.5,
                          textDecoration: "none",
                          fontWeight: "bold",
                          boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)"
                        }}
                        download
                        onClick={() => soundManager.playClick()}
                      >
                        Download ZIP
                      </a>
                    </div>
                  </div>
                  
                  <div style={{ height: "200px", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem 0", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "1px" }}>Live Logs</h3>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                       <LogPanel events={logs} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <div style={{ height: "calc(100vh - 140px)", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1rem" }}>
              <div style={{ height: "100%", overflow: "hidden" }}>
                <DAGView steps={steps} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem 0", textTransform: "uppercase", color: "#9ca3af", letterSpacing: "1px" }}>Live Logs</h3>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                     <LogPanel events={logs} />
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
