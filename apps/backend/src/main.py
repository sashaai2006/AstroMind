import uuid
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from src.agents.ceo import ceo_graph
from src.db.graph_store import db
from src.storage.minio_client import storage
from src.services.socket_manager import socket_manager # Import WS Manager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Gangai API", version="0.2.0") # Bump version

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
    await socket_manager.connect(websocket, project_id)
    try:
        while True:
            # Keep connection alive, maybe listen for user chat in future
            await websocket.receive_text()
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, project_id)

# --- REST API ---

class CreateProjectRequest(BaseModel):
    idea: str

class RunResponse(BaseModel):
    project_id: str
    status: str
    message: str

@app.post("/projects/run", response_model=RunResponse)
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

@app.get("/projects")
async def list_projects():
    return await db.get_recent_projects()

@app.get("/projects/{project_id}")
async def get_project(project_id: str):
    data = await db.get_project_graph(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data

@app.get("/files/{project_id}/{filename}")
async def download_file(project_id: str, filename: str):
    try:
        path = f"{project_id}/{filename}"
        content = storage.get_file(path)
        return Response(content=content, media_type="text/plain")
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=404, detail="File not found")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "gangai-backend-v2"}
