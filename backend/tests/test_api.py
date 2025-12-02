import os
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import settings as settings_module
from backend.main import app


@pytest.fixture(autouse=True)
def test_env(tmp_path, monkeypatch):
    projects_root = tmp_path / "projects"
    monkeypatch.setenv("PROJECTS_ROOT", str(projects_root))
    monkeypatch.setenv("LLM_MODE", "mock")
    settings_module.get_settings.cache_clear()
    yield
    settings_module.get_settings.cache_clear()


def _create_project(client: TestClient) -> str:
    response = client.post(
        "/api/projects",
        json={"title": "test", "description": "demo", "target": "web"},
    )
    assert response.status_code == 201
    return response.json()["project_id"]


def _wait_for_files(client: TestClient, project_id: str) -> None:
    for _ in range(20):
        files = client.get(f"/api/projects/{project_id}/files").json()
        if files:
            return
        time.sleep(0.2)
    raise AssertionError("Files were not generated in time")


def test_create_project_creates_directory():
    with TestClient(app) as client:
        project_id = _create_project(client)
        root = Path(os.environ["PROJECTS_ROOT"])
        assert (root / project_id).exists()


def test_files_endpoint_returns_entries():
    with TestClient(app) as client:
        project_id = _create_project(client)
        _wait_for_files(client, project_id)
        response = client.get(f"/api/projects/{project_id}/files")
        assert response.status_code == 200
        assert len(response.json()) > 0

