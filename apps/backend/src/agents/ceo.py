import json
import logging
import asyncio
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field, ValidationError
from typing import List

from src.agents.state import AgentState, Plan
from src.db.graph_store import db
from src.llm_factory import get_main_brain
from src.agents.worker import worker_node
from src.agents.reviewer import reviewer_node
from src.services.socket_manager import socket_manager # WS

logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class AgentModel(BaseModel):
    role: str = Field(description="The specific role of the agent")
    system_prompt: str = Field(description="Detailed system instructions")
    tools: List[str] = Field(description="List of tools needed", default=[])

class TaskModel(BaseModel):
    id: str = Field(description="Unique task ID")
    description: str = Field(description="Clear instruction of what to do")
    assigned_to: str = Field(description="The role of the agent assigned to this task")

class PlanModel(BaseModel):
    agents: List[AgentModel]
    tasks: List[TaskModel]

# --- CEO Node Logic ---
async def ceo_planner(state: AgentState):
    project_id = state['project_id']
    logger.info(f"CEO processing request: {state['user_request']}")
    
    # Notify UI
    await socket_manager.broadcast(project_id, {
        "type": "status", 
        "message": "CEO is brainstorming the team structure..."
    })
    
    llm = get_main_brain()
    structured_llm = llm.with_structured_output(PlanModel)

    system_prompt = """You are the CEO and Lead Architect.
    Analyze the user's request and create a detailed execution plan.
    RULES:
    1. Create 2-4 specialized agents.
    2. Break down work into 3-5 distinct tasks.
    3. Output JSON matching the PlanModel schema."""

    max_retries = 3
    for attempt in range(max_retries):
        try:
            if attempt > 0: await asyncio.sleep(2)
            
            response: PlanModel = await structured_llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=state['user_request'])
            ])
            
            # Validation Fix
            valid_roles = {a.role for a in response.agents}
            for task in response.tasks:
                if task.assigned_to not in valid_roles:
                    task.assigned_to = response.agents[0].role

            # Notify UI about the plan
            await socket_manager.broadcast(project_id, {
                "type": "plan_created", 
                "agents": [a.dict() for a in response.agents],
                "tasks": [t.dict() for t in response.tasks]
            })

            plan_dict: Plan = {
                "agents": [agent.dict() for agent in response.agents],
                "tasks": [task.dict() for task in response.tasks]
            }
            return {"plan": plan_dict, "iteration_count": 0}

        except Exception as e:
            logger.error(f"CEO Planning failed (attempt {attempt+1}): {e}")
            if attempt == max_retries - 1:
                await socket_manager.broadcast(project_id, {"type": "error", "message": "CEO failed to plan project."})
                raise e

async def save_to_graph(state: AgentState):
    try:
        plan = state.get('plan')
        project_id = state.get('project_id')
        if not plan or not project_id: return {"status": "failed"}

        await db.create_project(project_id, state['user_request'])
        await db.create_agents_and_tasks(project_id, plan['agents'], plan['tasks'])
        return {"status": "plan_saved"}
    except Exception as e:
        logger.error(f"DB Save failed: {e}")
        return {"status": "db_error"}

# --- Graph Construction ---
from langgraph.graph import StateGraph, END

def check_review_status(state: AgentState):
    """Conditional logic for the graph"""
    feedback = state.get('review_feedback', "")
    iterations = state.get('iteration_count', 0)
    
    # If feedback is empty, it means approved (or skipped)
    if not feedback:
        return "end"
    
    # If we have looped too many times, force stop
    if iterations >= 3:
        logger.warning("Max iterations reached. Stopping loop.")
        return "end"
    
    # Otherwise, go back to worker
    return "retry"

def create_ceo_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("ceo", ceo_planner)
    workflow.add_node("db_saver", save_to_graph)
    workflow.add_node("worker", worker_node)
    workflow.add_node("reviewer", reviewer_node) # NEW NODE

    workflow.set_entry_point("ceo")
    
    workflow.add_edge("ceo", "db_saver")
    workflow.add_edge("db_saver", "worker")
    workflow.add_edge("worker", "reviewer")
    
    # Conditional Edge
    workflow.add_conditional_edges(
        "reviewer",
        check_review_status,
        {
            "end": END,
            "retry": "worker"
        }
    )

    return workflow.compile()

ceo_graph = create_ceo_graph()
