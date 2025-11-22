from langgraph.graph import StateGraph, END
from src.agents.state import AgentState
from src.agents.ceo import ceo_node
from src.agents.workers import worker_node

def should_continue(state: AgentState):
    if state["current_agent_idx"] < len(state["plan"]):
        return "worker"
    return END

# Build Graph
workflow = StateGraph(AgentState)

workflow.add_node("ceo", ceo_node)
workflow.add_node("worker", worker_node)

workflow.set_entry_point("ceo")

workflow.add_edge("ceo", "worker")
workflow.add_conditional_edges(
    "worker",
    should_continue,
    {
        "worker": "worker",
        END: END
    }
)

app_graph = workflow.compile()

