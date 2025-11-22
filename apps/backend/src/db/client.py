import os
from neo4j import GraphDatabase
import logging

logger = logging.getLogger(__name__)

class MemgraphClient:
    def __init__(self):
        self.uri = os.getenv("MEMGRAPH_URI", "bolt://memgraph:7687")
        self.user = os.getenv("MEMGRAPH_USER", "gangai")
        self.password = os.getenv("MEMGRAPH_PASSWORD", "gangai_secret")
        self.driver = None

    def connect(self):
        if not self.driver:
            try:
                self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
                logger.info("Connected to Memgraph")
            except Exception as e:
                logger.error(f"Failed to connect to Memgraph: {e}")
                raise

    def close(self):
        if self.driver:
            self.driver.close()

    def execute_query(self, query, parameters=None):
        if not self.driver:
            self.connect()
        
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]

    def create_project(self, project_id: str, description: str):
        query = """
        MERGE (p:Project {id: $project_id})
        SET p.description = $description, p.created_at = timestamp()
        RETURN p
        """
        return self.execute_query(query, {"project_id": project_id, "description": description})

    def add_agent_to_project(self, project_id: str, agent_name: str, role: str, system_prompt: str):
        query = """
        MATCH (p:Project {id: $project_id})
        MERGE (a:Agent {name: $agent_name, role: $role})
        SET a.system_prompt = $system_prompt
        MERGE (p)-[:HAS_AGENT]->(a)
        RETURN a
        """
        return self.execute_query(query, {
            "project_id": project_id, 
            "agent_name": agent_name, 
            "role": role,
            "system_prompt": system_prompt
        })

    def log_execution(self, project_id: str, agent_name: str, task: str, result: str):
        query = """
        MATCH (p:Project {id: $project_id})-[:HAS_AGENT]->(a:Agent {name: $agent_name})
        CREATE (t:Task {description: $task, result: $result, timestamp: timestamp()})
        CREATE (a)-[:EXECUTED]->(t)
        RETURN t
        """
        return self.execute_query(query, {
            "project_id": project_id,
            "agent_name": agent_name,
            "task": task,
            "result": result
        })

# Singleton instance
db = MemgraphClient()

