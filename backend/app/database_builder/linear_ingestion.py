#!/usr/bin/env python3
"""
Script to ingest Linear tickets into Pinecone vector database.
Takes team ID and Pinecone database ID as arguments.
Uses LINEAR_API_KEY from environment variables.
"""

from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.schema import TextNode
import pinecone
from api_clients.linear_client import LinearClient
import constants
from api_clients.mongo import mongo_client


class LinearTicketIngester:
    def __init__(self, email: str):
        self.linear_client = LinearClient(
            api_key=mongo_client.get_linear_api_key(email=email)
        )
        self.username = mongo_client.get_username_by_email(email=email)
        self.index_name = f"{self.username}-user-database"

        # Initialize Pinecone
        self.pc = pinecone.Pinecone(api_key=constants.PINECONE_API_KEY)

        # Setup vector store with namespace
        self.pinecone_index = self.pc.Index(self.index_name)
        self.vector_store = PineconeVectorStore(
            pinecone_index=self.pinecone_index, namespace="linear-tickets"
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

    async def ingest_tickets(self, limit: int = 100):
        """Main ingestion process using fast TextNode batch upserting."""

        print("🔍 Fetching tickets for all teams")
        team_ids = await self.linear_client.get_team_ids()
        all_tickets = []
        for team_id in team_ids:
            print(f"🔍 Fetching tickets for team: {team_id}")
            tickets = await self.linear_client.fetch_team_tickets(team_id, limit)
            all_tickets.extend(tickets)

        print(f"📥 Found {len(all_tickets)} tickets to process")

        if not all_tickets:
            print("No tickets found. Exiting.")
            return

        # Convert tickets to TextNodes for faster batch processing
        nodes = []
        for ticket in all_tickets:
            content, metadata = self.linear_client.process_ticket(ticket)

            node = TextNode(text=content, metadata=metadata)
            nodes.append(node)

        print(f"Created {len(nodes)} ticket nodes from {len(all_tickets)} tickets")

        # Batch upsert using VectorStoreIndex for faster processing
        print(f"🚀 Adding {len(nodes)} tickets to Pinecone index: {self.index_name}")
        VectorStoreIndex(nodes=nodes, storage_context=self.storage_context)

        print("✅ All tickets successfully added to Pinecone!")
