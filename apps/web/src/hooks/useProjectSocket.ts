import { useEffect, useRef, useState } from 'react';

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
  
  const socketRef = useRef<WebSocket | null>(null);

  // 1. Fetch Initial State (for existing projects)
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectState = async () => {
      try {
        const res = await fetch(`http://localhost:8000/projects/${projectId}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        // Restore Agents
        if (data.agents) setAgents(data.agents);
        
        // Restore Tasks
        if (data.tasks) setTasks(data.tasks);
        
        // Restore Files (fetch content for each artifact)
        if (data.artifacts) {
          const loadedFiles: FileArtifact[] = [];
          // Map artifact paths back to tasks if possible via backend, 
          // currently backend returns flat artifacts list. 
          // For v2 graph, we might need to improve backend graph query later to link them,
          // but for now let's just load them.
          
          for (const art of data.artifacts) {
            try {
                const contentRes = await fetch(`http://localhost:8000/files/${projectId}/${art.name}`);
                if (contentRes.ok) {
                    const content = await contentRes.text();
                    loadedFiles.push({ name: art.name, content, task_id: undefined }); // Backend graph query doesn't return task_id for artifact yet in flat list
                }
            } catch (e) {
                console.error(`Failed to load file ${art.name}`, e);
            }
          }
          setFiles(loadedFiles);
          if (loadedFiles.length > 0) setActiveFile(loadedFiles[0]);
        }
        
        setLogs(prev => [...prev, "Restored project state from Neural Memory."]);

      } catch (e) {
        console.error("Failed to fetch project state:", e);
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
      setLogs(prev => [...prev, "Connected to Gangai Neural Network..."]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Message:", data);

        if (data.type === 'status') {
          setLogs(prev => [...prev, `> ${data.message}`]);
        }
        
        if (data.type === 'plan_created') {
          setAgents(data.agents);
          setTasks(data.tasks);
          setLogs(prev => [...prev, "CEO: Plan approved. Hiring agents..."]);
        }

        if (data.type === 'task_start') {
          setTasks(prev => prev.map(t => t.id === data.task_id ? { ...t, status: 'in_progress' } : t));
          setLogs(prev => [...prev, `${data.role}: Starting task "${data.message}"`]);
        }

        if (data.type === 'task_complete') {
          setTasks(prev => prev.map(t => t.id === data.task_id ? { ...t, status: 'completed' } : t));
        }

        if (data.type === 'file_created') {
          // Deduplicate files
          setFiles(prev => {
            if (prev.some(f => f.name === data.file.name)) return prev;
            return [...prev, { ...data.file, task_id: data.task_id }];
          });
          setActiveFile(data.file);
          setLogs(prev => [...prev, `System: File ${data.file.name} generated.`]);
        }

        if (data.type === 'execution_log') {
          const prefix = data.exit_code === 0 ? '✅' : '❌';
          const logMsg = `${prefix} Sandbox (${data.task_id}) exit ${data.exit_code}\n${data.output || data.error || ''}`;
          setLogs(prev => [...prev, logMsg]);
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onerror = (e) => {
        console.error("WS Error:", e);
        setLogs(prev => [...prev, "Connection Error. Retrying..."]);
        setIsConnected(false);
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

  return { isConnected, logs, agents, tasks, files, activeFile, setActiveFile };
}
