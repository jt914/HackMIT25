#!/usr/bin/env python3
"""
Script to ingest Slack channel messages into Pinecone vector database.
Mirrors the LinearTicketIngester style for consistency.
Takes channel id, Slack API key, and timeframe, and indexes messages.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.schema import TextNode
import pinecone
import constants
from api_clients.slack_client import SlackClient
from api_clients.mongo import mongo_client


class SlackMessageIngester:
    def __init__(self, email: str):
        self.username = mongo_client.get_username_by_email(email=email)
        self.index_name = f"{self.username}-user-database"
        self.slack_client = SlackClient(api_key=mongo_client.get_slack_api_key(email=email))

        # Initialize Pinecone
        self.pc = pinecone.Pinecone(api_key=constants.PINECONE_API_KEY)

        # Setup vector store with namespace for slack messages
        self.pinecone_index = self.pc.Index(self.index_name)
        self.vector_store = PineconeVectorStore(
            pinecone_index=self.pinecone_index, namespace="slack-messages"
        )
        self.storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )

        # Configure LlamaIndex to use 1024-dim OpenAI embeddings
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-3-large",
            dimensions=1024,
            api_key=constants.OPENAI_API_KEY,
        )

    async def ingest_messages(
        self,
        channel_id: str,
        oldest: Optional[datetime] = None,
        latest: Optional[datetime] = None,
        limit: int = 200,
    ) -> Dict[str, Any]:
        """Fetch Slack messages and index them into Pinecone."""
        try:

            messages = await self.slack_client.fetch_channel_messages(
                channel_id=channel_id, oldest=oldest, latest=latest, limit=limit
            )

            if not messages:
                return {"success": True, "output": "No Slack messages in timeframe."}

            # Collect user IDs to map to names
            user_ids: List[str] = []
            for m in messages:
                if m.get("user"):
                    user_ids.append(m["user"])
                elif m.get("bot_id"):
                    user_ids.append(m["bot_id"])

            user_map = await self.slack_client.fetch_user_map(user_ids)

            # Convert to TextNodes
            nodes: List[TextNode] = []
            for message in messages:
                content, metadata = self.slack_client.process_message(
                    message, user_map, channel_id
                )
                node = TextNode(text=content, metadata=metadata)
                nodes.append(node)

            if not nodes:
                return {"success": True, "output": "No valid Slack messages to index."}

            # Batch upsert using VectorStoreIndex
            VectorStoreIndex(nodes=nodes, storage_context=self.storage_context)

            return {
                "success": True,
                "output": f"Indexed {len(nodes)} Slack messages to {self.index_name}",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}


