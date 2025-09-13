"""
Query runner for searching Pinecone indexes with LlamaIndex.
Based on the existing query.py logic.
"""

from typing import Dict, Any
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    get_response_synthesizer,
    Settings,
)
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SimilarityPostprocessor
import pinecone
import app.constants as constants


class QueryRunner:
    """Class to run queries against Pinecone indexes using the query.py logic."""

    def __init__(self):
        # Configure LlamaIndex to use OpenAI embeddings to match the Pinecone index
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-3-large", dimensions=1024
        )

        # Initialize Pinecone
        self.pc = pinecone.Pinecone(api_key=constants.PINECONE_API_KEY)

    async def run_query(self, query: str, index_name: str) -> Dict[str, Any]:
        try:
            # Connect to the specific index
            pinecone_index = self.pc.Index(index_name)
            vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)

            # Recreate an index view over the existing Pinecone vector store
            index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
                storage_context=storage_context,
            )

            # Configure retriever
            retriever = VectorIndexRetriever(
                index=index,
                similarity_top_k=10,
            )

            # Configure response synthesizer
            response_synthesizer = get_response_synthesizer()

            # Assemble query engine
            query_engine = RetrieverQueryEngine(
                retriever=retriever,
                response_synthesizer=response_synthesizer,
                node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=0.1)],
            )

            # Run the query
            response = query_engine.query(query)

            return {
                "success": True,
                "query": query,
                "index_name": index_name,
                "results": str(response),
            }

        except Exception as e:
            return {
                "success": False,
                "query": query,
                "index_name": index_name,
                "error": str(e),
            }


query_runner = QueryRunner()
