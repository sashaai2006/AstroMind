import docker
import logging
import tarfile
import io
import contextlib

logger = logging.getLogger(__name__)

class SandboxService:
    """
    Minimal wrapper around Docker for executing untrusted code.
    Currently supports Python, but the interface is extensible.
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
            return self._run_python(code, timeout)
        return {"output": "", "exit_code": -1, "error": f"Language {language} not supported"}

    def _run_python(self, code: str, timeout: int) -> dict:
        if not self.client:
            return {"output": "", "exit_code": -1, "error": "Docker not available"}

        container = None
        try:
            container = self.client.containers.run(
                "python:3.11-slim",
                command="sleep 60",
                detach=True,
                mem_limit="256m",
                network_disabled=True,
                stdin_open=False,
                tty=False
            )

            tar_stream = io.BytesIO()
            with tarfile.open(fileobj=tar_stream, mode="w") as tar:
                data = code.encode("utf-8")
                info = tarfile.TarInfo(name="script.py")
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
            tar_stream.seek(0)

            container.exec_run("mkdir -p /sandbox")
            container.put_archive("/sandbox", tar_stream)

            exit_code, output = container.exec_run(
                "timeout %s python /sandbox/script.py" % timeout,
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
                    container.stop()
                    container.remove()

sandbox = SandboxService()

