# agent_helpers.py
"""
Helper functions and tools for the LessonAgent.
Contains non-agent specific functionality like tool creation, search functions, and utilities.
"""

from typing import Dict
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex
import app.constants as constants


def create_vectorstore_index(index_name: str = "codebase", namespace: str = "codevectors") -> VectorStoreIndex:
    """Create a LlamaIndex VectorStoreIndex using Pinecone with native LlamaIndex integration."""

    # Create vector store using LlamaIndex's native Pinecone integration
    vector_store = PineconeVectorStore(
        api_key=constants.PINECONE_API_KEY,
        index_name=index_name,
        environment=constants.PINECONE_ENV,
        namespace=namespace,
    )

    # Create embedding model
    embedding = OpenAIEmbedding(
        model="text-embedding-3-large",
        dimensions=1024,
        api_key=constants.OPENAI_API_KEY,
    )

    # Create and return VectorStoreIndex
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store, embed_model=embedding
    )