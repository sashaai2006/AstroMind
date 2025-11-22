from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.agents.state import AgentState
from src.db.client import db
from src.storage.client import storage

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0) # Cheaper model for workers for now

async def worker_node(state: AgentState):
    plan = state["plan"]
    idx = state["current_agent_idx"]
    project_id = state["project_id"]

    if idx >= len(plan):
        return {"messages": ["All tasks completed."]}

    current_task = plan[idx]
    print(f"--- WORKER {current_task['role']} ({current_task['name']}) STARTED ---")
    print(f"Task: {current_task['description']}")

    # Generate content/code
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a {role}. Your name is {name}. Perform the following task: {task}. Return ONLY the content of the file you would create (e.g. code or text). Do not include markdown formatting like ```."),
        ("user", "Project Context: {context}")
    ])
    
    chain = prompt | llm
    result = chain.invoke({
        "role": current_task["role"],
        "name": current_task["name"],
        "task": current_task["description"],
        "context": state["user_query"]
    })
    
    content = result.content
    
    # Save artifact
    filename = f"{current_task['role']}_{idx}.txt" # Simple naming for now
    s3_path = storage.upload_file(project_id, filename, content)
    
    # Log to DB
    db.log_execution(project_id, current_task["name"], current_task["description"], s3_path)

    current_task["status"] = "done"
    
    return {
        "current_agent_idx": idx + 1,
        "messages": [f"{current_task['name']}: Completed task '{current_task['description']}'. Saved to {s3_path}"],
        "plan": plan, # Update status
        "artifacts": [s3_path]
    }

