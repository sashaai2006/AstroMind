import uuid
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from src.agents.ceo import ceo_graph
from src.db.graph_store import db
from src.storage.minio_client import storage
from src.services.socket_manager import socket_manager
from src.services.github_client import github_client

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AstraMind API", 
    version="1.0.0",
    description="""
    # AstraMind Autonomous AI Swarm API
    
    The core orchestration engine for spawning AI agent swarms.
    
    ## Features
    * **Project Generation**: Launch autonomous teams from a single prompt.
    * **Real-time Graph**: Monitor agent interactions via WebSockets.
    * **File Management**: Retrieve generated artifacts.
    """
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    await db.connect()

@app.on_event("shutdown")
async def shutdown_db():
    await db.close()

# --- WebSocket Endpoint ---
@app.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    """
    Real-time event stream for a specific project.
    Emits events: 'status', 'plan_created', 'task_start', 'file_created', 'execution_log'.
    """
    await socket_manager.connect(websocket, project_id)
    try:
        while True:
            # Keep connection alive, maybe listen for user chat in future
            await websocket.receive_text()
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, project_id)

# --- REST API ---

class CreateProjectRequest(BaseModel):
    idea: str = Field(
        ..., 
        title="Project Idea", 
        description="A detailed description of the software you want to build.", 
        min_length=5,
        example="Create a snake game in Python with a GUI."
    )

class RunResponse(BaseModel):
    project_id: str = Field(..., description="Unique UUID of the spawned project swarm.")
    status: str
    message: str

@app.post(
    "/projects/run", 
    response_model=RunResponse, 
    summary="Launch a New Project",
    description="Initializes the CEO Agent to analyze the idea and form a team."
)
async def run_project(req: CreateProjectRequest, background_tasks: BackgroundTasks):
    project_id = str(uuid.uuid4())
    logger.info(f"Starting project {project_id} with idea: {req.idea}")

    initial_state = {
        "project_id": project_id,
        "user_request": req.idea,
        "messages": [],
        "plan": None,
        "status": "started"
    }

    background_tasks.add_task(ceo_graph.ainvoke, initial_state)

    return {
        "project_id": project_id,
        "status": "queued",
        "message": "CEO Agent is analyzing your request..."
    }

@app.get(
    "/projects", 
    summary="List Recent Projects",
    description="Returns a list of recently created projects from the graph database."
)
async def list_projects():
    return await db.get_recent_projects()

@app.get(
    "/projects/{project_id}",
    summary="Get Project State",
    description="Retrieves the full graph state (agents, tasks, artifacts) for a project."
)
async def get_project(project_id: str):
    data = await db.get_project_graph(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data

@app.get(
    "/files/{project_id}/{filename}",
    summary="Download Artifact",
    description="Stream the content of a generated file."
)
async def download_file(project_id: str, filename: str):
    try:
        path = f"{project_id}/{filename}"
        content = storage.get_file(path)
        return Response(content=content, media_type="text/plain")
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=404, detail="File not found")

@app.post(
    "/projects/{project_id}/github",
    summary="Push to GitHub",
    description="Creates a repository and pushes all generated artifacts."
)
async def push_to_github(project_id: str):
    project_data = await db.get_project_graph(project_id)
    if not project_data:
         raise HTTPException(status_code=404, detail="Project not found")
         
    # Retrieve all files
    files = {}
    if 'artifacts' in project_data:
        for art in project_data['artifacts']:
            try:
                 content = storage.get_file(f"{project_id}/{art['name']}")
                 if content:
                     files[art['name']] = content.decode('utf-8') # Assuming text
            except Exception as e:
                logger.warning(f"Could not read file {art['name']} for git push: {e}")

    if not files:
        raise HTTPException(status_code=400, detail="No files to push")

    description = project_data.get('description', f"Project {project_id}")
    # Use a safe name derived from description or UUID
    repo_name = f"astra-{project_id[:8]}" 
    
    url = await github_client.push_project(project_id, repo_name, files)
    
    return {"url": url}

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "astramind-backend"}
