import operator
from typing import Annotated, List, TypedDict, Union, Dict

class Task(TypedDict):
    id: str
    description: str
    assigned_to: str # Role name

class AgentDefinition(TypedDict):
    role: str
    system_prompt: str
    tools: List[str]

class Plan(TypedDict):
    agents: List[AgentDefinition]
    tasks: List[Task]

class AgentState(TypedDict):
    # Messages history
    messages: Annotated[List[str], operator.add]
    # The user's original request
    user_request: str
    # The unique project ID
    project_id: str
    # The generated plan (agents + tasks)
    plan: Union[Plan, None]
    # Execution status
    status: str
    
    # --- New Fields for v6.0 Intelligence ---
    # Store generated code content for review: { "task_id": "code_content" }
    generated_artifacts: Dict[str, str]
    # Feedback from the reviewer agent
    review_feedback: str
    # How many times we've looped back
    iteration_count: int
