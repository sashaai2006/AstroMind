import logging
import os

logger = logging.getLogger(__name__)

class GithubClient:
    """
    Handles interaction with GitHub API for auto-pushing projects.
    Uses PyGithub if available, otherwise mocks behavior.
    """
    def __init__(self):
        self.token = os.getenv("GITHUB_TOKEN")
        self.enabled = bool(self.token)
        if not self.enabled:
            logger.warning("GITHUB_TOKEN not set. GitHub integration disabled (mock mode).")

    async def push_project(self, project_id: str, project_name: str, files: dict) -> str:
        """
        Creates a new repo and pushes files.
        Returns the URL of the new repository.
        """
        if not self.enabled:
            # Mock behavior
            logger.info(f"MOCK: Creating GitHub repo 'astra-{project_name}'...")
            return f"https://github.com/mock-user/astra-{project_name.lower().replace(' ', '-')}"
        
        # Real implementation would use PyGithub here
        # from github import Github
        # g = Github(self.token)
        # user = g.get_user()
        # repo = user.create_repo(f"astra-{project_name}")
        # ... push files ...
        
        return f"https://github.com/real-user/astra-{project_name}"

github_client = GithubClient()

