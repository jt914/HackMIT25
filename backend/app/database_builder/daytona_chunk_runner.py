import os
from typing import Dict, Any

from daytona import Daytona, CreateSandboxFromSnapshotParams, DaytonaConfig
import constants
from api_clients.mongo import mongo_client


class DaytonaChunkRunner:
    def __init__(self, snapshot_name):
        self.snapshot_name = snapshot_name
        self.daytona = Daytona(DaytonaConfig(api_key=constants.DAYTONA_API_KEY))

        self.sandbox = self.daytona.create(
            CreateSandboxFromSnapshotParams(snapshot=self.snapshot_name)
        )

    def _extract_repo_name(self, repo_url: str) -> str:
        """Extract repository name from GitHub URL and make it Pinecone-compatible."""
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        # Replace underscores with hyphens to make it Pinecone-compatible
        return repo_name.replace("_", "-").lower()

    def _validate_github_url(self, repo_url: str) -> bool:
        return (
            repo_url.startswith("https://github.com/") and len(repo_url.split("/")) >= 5
        )

    async def process_repository(self, repo_url: str, email: str) -> Dict[str, Any]:
        username = mongo_client.get_username_by_email(email)
        if not self._validate_github_url(repo_url):
            return {
                "success": False,
                "error": "Invalid GitHub URL format. Must be https://github.com/owner/repo",
            }

        try:
            repo_name = self._extract_repo_name(repo_url)
            repo_path = f"/codebase/{repo_name}"

            self.sandbox.git.clone(url=repo_url, path=repo_path)

            # Execute the chunking script with proper environment
            result = self.sandbox.process.exec(
                f"cd /home/daytona/codevectors && ~/.local/bin/uv run python run_chunker.py {username} {repo_path}",
                env={
                    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
                    "PINECONE_API_KEY": os.getenv("PINECONE_API_KEY"),
                },
            )

            if result.exit_code == 0:
                mongo_client.update_user_integrations(email, "github", True)
                return {
                    "success": True,
                    "repository": repo_url,
                    "sandbox_id": self.sandbox.id,
                    "output": result.result,
                }
            else:
                return {
                    "success": False,
                    "repository": repo_url,
                    "sandbox_id": self.sandbox.id,
                    "error": f"Chunking failed with exit code {result.exit_code}",
                    "output": result.result,
                }

        except Exception as e:
            return {"success": False, "repository": repo_url, "error": str(e)}
        finally:
            await self._cleanup()

    async def _cleanup(self):
        """Clean up the Daytona sandbox."""
        if self.sandbox:
            try:
                print("Cleaning up sandbox...")
                self.sandbox.delete()
                print("Sandbox deleted")
            except Exception as e:
                print(f"Warning: Failed to cleanup sandbox: {e}")
