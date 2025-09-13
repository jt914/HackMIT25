#!/usr/bin/env python3
"""
Script to build a Daytona image with all dependencies pre-installed for chunking.
This creates a snapshot that can be reused for faster chunking operations.
"""

import os
import sys

from daytona import Daytona
import dotenv

# Load environment variables
dotenv.load_dotenv()


def main():
    # Validate environment variables
    required_env_vars = ["DAYTONA_API_KEY", "GITHUB_TOKEN"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]

    if missing_vars:
        print(
            f"Error: Missing required environment variables: {', '.join(missing_vars)}"
        )
        print("Please set these in your .env file or environment")
        print("GITHUB_TOKEN is needed to clone the private codevectors repository")
        sys.exit(1)

    try:
        # Initialize Daytona
        print("Initializing Daytona...")
        daytona = Daytona()

        # Import required classes for snapshot creation
        from daytona import CreateSnapshotParams, Image, Resources
        import time

        # Get GitHub token for private repository access
        github_token = os.getenv("GITHUB_TOKEN")

        # Generate a unique name for the snapshot
        snapshot_name = f"codevectors-chunking-env:{int(time.time())}"
        print(f"Creating snapshot: {snapshot_name}")

        # Create the image with all dependencies using declarative builder
        print("Building image with dependencies...")
        image = (
            Image.debian_slim("3.12")
            # Install system dependencies
            .run_commands(
                "apt-get update",
                "apt-get install -y git curl build-essential python3-dev python3-pip",
            )
            # Install UV package manager
            .run_commands(
                "curl -LsSf https://astral.sh/uv/install.sh | sh",
                'echo "export PATH=\\"$HOME/.local/bin:$PATH\\"" >> ~/.bashrc',
            )
            # Clone codevectors repository using GitHub token
            .run_commands(
                f"git clone https://{github_token}@github.com/jt914/codevectors /home/daytona/codevectors"
            )
            # Install dependencies from pyproject.toml
            .run_commands(
                "cd /home/daytona/codevectors && ~/.local/bin/uv sync || pip install -e ."
            )
            # Set working directory
            .workdir("/home/daytona")
        )

        # Create the snapshot using the proper SDK method
        print(f"\nCreating snapshot: {snapshot_name}")
        daytona.snapshot.create(
            CreateSnapshotParams(
                name=snapshot_name,
                image=image,
                resources=Resources(
                    cpu=1,
                    memory=1,
                    disk=3,
                ),
            ),
            on_logs=print,
        )

        print("\n🎉 SUCCESS! Daytona snapshot created successfully!")
        print(f"📸 Snapshot Name: {snapshot_name}")

        print("\n💾 Snapshot name saved to: daytona_snapshot_id.txt")
        print("\n🚀 You can now use this snapshot in your chunking script!")
        print(f"   Snapshot Name: {snapshot_name}")

        return snapshot_name

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    snapshot_id = main()
    print(f"\n✅ Image build complete! Use snapshot ID: {snapshot_id}")
