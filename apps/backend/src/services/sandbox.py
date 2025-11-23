import docker
import logging
import tarfile
import io
import contextlib

logger = logging.getLogger(__name__)

class SandboxService:
    """
    Minimal wrapper around Docker for executing untrusted code.
    Supports Python and Node.js.
    """
    def __init__(self):
        self.client = None
        try:
            self.client = docker.from_env()
            logger.info("Docker Sandbox initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Docker: {e}")

    def run_code(self, language: str, code: str, timeout: int = 15) -> dict:
        if language.lower() == "python":
            return self._run_container("python:3.11-slim", ["python", "/sandbox/script.py"], code, "script.py", timeout)
        elif language.lower() in ["javascript", "js", "node"]:
            return self._run_container("node:18-slim", ["node", "/sandbox/script.js"], code, "script.js", timeout)
        return {"output": "", "exit_code": -1, "error": f"Language {language} not supported"}

    def _run_container(self, image: str, command: list, code: str, filename: str, timeout: int) -> dict:
        if not self.client:
            return {"output": "", "exit_code": -1, "error": "Docker not available"}

        container = None
        try:
            # Ensure image exists (pull if needed, mostly cached)
            # try:
            #     self.client.images.get(image)
            # except docker.errors.ImageNotFound:
            #     logger.info(f"Pulling image {image}...")
            #     self.client.images.pull(image)

            container = self.client.containers.run(
                image,
                command="sleep 60", # Keep alive
                detach=True,
                mem_limit="256m",
                network_disabled=True, # No internet for safety
                stdin_open=False,
                tty=False
            )

            # Prepare file
            tar_stream = io.BytesIO()
            with tarfile.open(fileobj=tar_stream, mode="w") as tar:
                data = code.encode("utf-8")
                info = tarfile.TarInfo(name=filename)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
            tar_stream.seek(0)

            # Upload file
            container.exec_run("mkdir -p /sandbox")
            container.put_archive("/sandbox", tar_stream)

            # Execute with timeout
            # Note: 'timeout' command might not be available in minimal slim images
            # so we handle timeout in python if needed, but for now rely on container lifespan
            
            cmd_str = " ".join(command)
            exit_code, output = container.exec_run(
                cmd_str,
                workdir="/sandbox"
            )

            return {
                "output": output.decode("utf-8", errors="ignore"),
                "exit_code": exit_code,
                "error": None if exit_code == 0 else "Execution failed"
            }
        except Exception as e:
            logger.error(f"Sandbox execution failed: {e}")
            return {"output": "", "exit_code": -1, "error": str(e)}
        finally:
            if container:
                with contextlib.suppress(Exception):
                    container.stop(timeout=1)
                    container.remove()

sandbox = SandboxService()
