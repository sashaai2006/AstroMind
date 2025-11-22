import os
import logging
from neo4j import GraphDatabase, AsyncGraphDatabase

logger = logging.getLogger(__name__)

class GraphStore:
    def __init__(self):
        self.uri = os.getenv("MEMGRAPH_URI", "bolt://memgraph:7687")
        self.user = os.getenv("MEMGRAPH_USER", "gangai")
        self.password = os.getenv("MEMGRAPH_PASSWORD", "gangai_secret")
        self.driver = None

    async def connect(self):
        if not self.driver:
            try:
                self.driver = AsyncGraphDatabase.driver(
                    self.uri, 
                    auth=(self.user, self.password)
                )
                logger.info("Connected to Graph DB")
                await self.ensure_indexes()
            except Exception as e:
                logger.error(f"Failed to connect to Graph DB: {e}")
                raise e

    async def ensure_indexes(self):
        queries = [
            "CREATE INDEX ON :Project(id);",
            "CREATE INDEX ON :Agent(role);",
            "CREATE INDEX ON :Agent(project_id);",
            "CREATE INDEX ON :Task(id);",
            "CREATE INDEX ON :Artifact(path);"
        ]
        async with self.driver.session() as session:
            for q in queries:
                try:
                    await session.run(q)
                except Exception as e:
                    logger.debug(f"Index creation note: {e}")

    async def close(self):
        if self.driver:
            await self.driver.close()

    async def create_project(self, project_id: str, description: str):
        query = """
        MERGE (p:Project {id: $id})
        SET p.description = $description, p.created_at = timestamp()
        RETURN p
        """
        async with self.driver.session() as session:
            await session.run(query, id=project_id, description=description)

    async def create_agents_and_tasks(self, project_id: str, agents: list, tasks: list):
        async with self.driver.session() as session:
            # 1. Create Agents
            for agent in agents:
                agent_query = """
                MATCH (p:Project {id: $project_id})
                MERGE (a:Agent {role: $role, project_id: $project_id})
                SET a.system_prompt = $system_prompt
                MERGE (p)-[:HAS_AGENT]->(a)
                """
                await session.run(agent_query, project_id=project_id, role=agent['role'], system_prompt=agent['system_prompt'])

            # 2. Create Tasks
            for task in tasks:
                task_query = """
                MATCH (p:Project {id: $project_id})
                MERGE (t:Task {id: $task_id})
                SET t.description = $description, t.status = 'pending'
                MERGE (p)-[:HAS_TASK]->(t)
                
                WITH t, p
                MATCH (a:Agent {role: $assigned_to, project_id: $project_id})
                MERGE (a)-[:ASSIGNED_TO]->(t)
                """
                await session.run(
                    task_query, 
                    project_id=project_id, 
                    task_id=task['id'], 
                    description=task['description'], 
                    assigned_to=task['assigned_to']
                )

    async def save_artifact(self, project_id: str, task_id: str, name: str, path: str):
        """Saves metadata about a generated file"""
        query = """
        MATCH (t:Task {id: $task_id})
        MERGE (art:Artifact {path: $path})
        SET art.name = $name, art.created_at = timestamp()
        MERGE (t)-[:PRODUCED]->(art)
        """
        async with self.driver.session() as session:
            await session.run(query, task_id=task_id, name=name, path=path)

    async def get_project_graph(self, project_id: str):
        query = """
        MATCH (p:Project {id: $project_id})
        OPTIONAL MATCH (p)-[:HAS_AGENT]->(a:Agent)
        OPTIONAL MATCH (p)-[:HAS_TASK]->(t:Task)
        OPTIONAL MATCH (a)-[:ASSIGNED_TO]->(t)
        OPTIONAL MATCH (t)-[:PRODUCED]->(art:Artifact)
        RETURN p, collect(DISTINCT a) as agents, collect(DISTINCT t) as tasks, collect(DISTINCT art) as artifacts
        """
        async with self.driver.session() as session:
            result = await session.run(query, project_id=project_id)
            record = await result.single()
            
            if not record:
                return None

            project = dict(record["p"])
            
            agents = []
            for node in record["agents"]:
                d = dict(node)
                if "system_prompt" in d: del d["system_prompt"]
                agents.append(d)

            tasks = []
            for node in record["tasks"]:
                tasks.append(dict(node))

            artifacts = []
            for node in record["artifacts"]:
                artifacts.append(dict(node))

            return {
                "project": project,
                "agents": agents,
                "tasks": tasks,
                "artifacts": artifacts
            }

    async def get_recent_projects(self, limit: int = 10):
        query = """
        MATCH (p:Project)
        RETURN p.id as id, p.description as description, p.created_at as created_at
        ORDER BY p.created_at DESC
        LIMIT $limit
        """
        async with self.driver.session() as session:
            result = await session.run(query, limit=limit)
            return [dict(record) async for record in result]

db = GraphStore()
