import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export type Agent = { role: string; system_prompt?: string };
export type Task = { id: string; description: string; assigned_to: string; status: 'pending' | 'in_progress' | 'completed' };
export type FileArtifact = { name: string; content: string; task_id?: string };

export function useProjectSocket(projectId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileArtifact[]>([]);
  const [activeFile, setActiveFile] = useState<FileArtifact | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  
  const socketRef = useRef<WebSocket | null>(null);

  // 1. Fetch Initial State (for existing projects)
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectState = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/projects/${projectId}`);
        if (!res.ok) throw new Error("Project not found");
        
        const data = await res.json();
        
        if (data.agents) setAgents(data.agents);
        if (data.tasks) setTasks(data.tasks);
        
        if (data.artifacts) {
          const loadedFiles: FileArtifact[] = [];
          for (const art of data.artifacts) {
            try {
                const contentRes = await fetch(`http://localhost:8000/files/${projectId}/${art.name}`);
                if (contentRes.ok) {
                    const content = await contentRes.text();
                    loadedFiles.push({ name: art.name, content, task_id: undefined });
                }
            } catch (e) {
                console.error(`Failed to load file ${art.name}`, e);
            }
          }
          setFiles(loadedFiles);
          if (loadedFiles.length > 0) setActiveFile(loadedFiles[0]);
        }
        
        setLogs(prev => [...prev, "Restored project state from Neural Memory."]);
        toast.success("Project state restored");

      } catch (e) {
        console.error("Failed to fetch project state:", e);
        toast.error("Failed to load project history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectState();

  }, [projectId]);

  // 2. WebSocket Connection
  useEffect(() => {
    if (!projectId) return;

    const wsUrl = `ws://localhost:8000/ws/${projectId}`;
    console.log("Connecting to WS:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WS Open");
      setIsConnected(true);
      setLogs(prev => [...prev, "Connected to AstraMind Neural Network..."]);
      toast.success("Neural Link Established");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Message:", data);

        if (data.type === 'status') {
          setLogs(prev => [...prev, `> ${data.message}`]);
        }
        
        if (data.type === 'error') {
            toast.error(data.message);
            setLogs(prev => [...prev, `ERROR: ${data.message}`]);
        }
        
        if (data.type === 'plan_created') {
          setAgents(data.agents);
          setTasks(data.tasks);
          setLogs(prev => [...prev, "CEO: Plan approved. Hiring agents..."]);
          toast.info("Mission Plan Created");
        }

        if (data.type === 'task_start') {
          setTasks(prev => prev.map(t => t.id === data.task_id ? { ...t, status: 'in_progress' } : t));
          setLogs(prev => [...prev, `${data.role}: Starting task "${data.message}"`]);
        }

        if (data.type === 'task_complete') {
          setTasks(prev => prev.map(t => t.id === data.task_id ? { ...t, status: 'completed' } : t));
          // toast.success(`Task Completed`); // Optional, might be too spammy
        }

        if (data.type === 'file_created') {
          setFiles(prev => {
            if (prev.some(f => f.name === data.file.name)) return prev;
            return [...prev, { ...data.file, task_id: data.task_id }];
          });
          setActiveFile(data.file);
          setLogs(prev => [...prev, `System: File ${data.file.name} generated.`]);
          toast.success(`Artifact Generated: ${data.file.name}`);
        }

        if (data.type === 'execution_log') {
          const prefix = data.exit_code === 0 ? '✅' : '❌';
          const logMsg = `${prefix} Sandbox (${data.task_id}) exit ${data.exit_code}\n${data.output || data.error || ''}`;
          setLogs(prev => [...prev, logMsg]);
          if (data.exit_code !== 0) {
              toast.warning(`Sandbox Execution Failed (${data.exit_code})`);
          }
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onerror = (e) => {
        console.error("WS Error:", e);
        setLogs(prev => [...prev, "Connection Error. Retrying..."]);
        setIsConnected(false);
        toast.error("Neural Link Severed");
    };

    ws.onclose = (e) => {
        console.log("WS Closed", e);
        setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [projectId]);

  return { isConnected, logs, agents, tasks, files, activeFile, setActiveFile, isLoading };
}
