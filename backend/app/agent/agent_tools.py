from typing import List
from llama_index.core import VectorStoreIndex
from llama_index.core.tools import FunctionTool
import agent.agent_helpers as agent_helpers



def create_codebase_search_tool(index_name: str) -> FunctionTool:
    def search_func(query: str, k: int = 5) -> str:
        try:
            print("🔍 TOOL CALL: search_codebase")
            print(f"   📝 Query: '{query}'")
            print(f"   🔢 Top-k: {k}")

            index = agent_helpers.create_vectorstore_index(index_name, namespace="codevectors")

            # Use LlamaIndex's retriever without namespace in kwargs
            retriever = index.as_retriever(similarity_top_k=k)
            print("   🔄 Retrieving nodes from vector store...")
            nodes = retriever.retrieve(query)

            if not nodes:
                print(f"   ❌ No results found for query: '{query}'")
                return f"No results found for query: '{query}'. Try a different search term or check if the index contains relevant data."

            print(f"   ✅ Found {len(nodes)} results")
            # Format results for the agent
            formatted_results = []
            for i, node in enumerate(nodes, 1):
                # Extract content and metadata directly from TextNode
                content = node.text if hasattr(node, "text") else node.node.text
                file_path = (
                    node.metadata.get("file_path", "Unknown")
                    if hasattr(node, "metadata")
                    else node.node.metadata.get("file_path", "Unknown")
                )
                score = node.score if hasattr(node, "score") else "N/A"

                # Truncate content for preview
                content_preview = content[:500] if content else "No content available"

                formatted_results.append(f"""
                    Result {i}:
                    File: {file_path}
                    Content: {content_preview}...
                    Score: {score}
                """)
                print(f"     📄 Result {i}: {file_path} (score: {score})")

            result = "\n".join(formatted_results)
            print(f"   📤 Returning {len(result)} characters of search results")
            return result

        except Exception as e:
            error_msg = f"❌ Error searching codebase: {str(e)}"
            print(error_msg)  # Also print for debugging
            return error_msg

    return FunctionTool.from_defaults(
        fn=search_func,
        name="search_codebase",
        description="""Search our company's codebase using vector similarity search. 
        IMPORTANT: This is a vector database that finds semantically similar code chunks, not exact text matching.
        Returns: Raw code chunks with file paths and similarity scores. You'll get multiple chunks that you need to analyze and synthesize to understand our architectural patterns.""",
    )

def create_linear_ticket_search_tool(index_name: str) -> FunctionTool:
    def search_func(query: str, k: int = 5) -> str:
        try:
            print("🔍 TOOL CALL: search_linear_ticket")
            print(f"   📝 Query: '{query}'")
            print(f"   🔢 Top-k: {k}")

            index = agent_helpers.create_vectorstore_index(index_name, namespace="linear-tickets")

            # Use LlamaIndex's retriever without namespace in kwargs
            retriever = index.as_retriever(similarity_top_k=k)
            print("   🔄 Retrieving nodes from vector store...")
            nodes = retriever.retrieve(query)

            if not nodes:
                print(f"   ❌ No results found for query: '{query}'")
                return f"No results found for query: '{query}'. Try a different search term or check if the index contains relevant data."

            print(f"   ✅ Found {len(nodes)} results")
            # Format results for the agent
            formatted_results = []
            for i, node in enumerate(nodes, 1):
                # Extract content and metadata directly from TextNode
                content = node.text if hasattr(node, "text") else node.node.text
                metadata = (
                    node.metadata
                    if hasattr(node, "metadata")
                    else node.node.metadata
                )
                score = node.score if hasattr(node, "score") else "N/A"

                # Get basic info for logging
                ticket_id = metadata.get("identifier", "Unknown")
                title = metadata.get("title", "No title")

                # Truncate content for preview
                content_preview = content[:500] if content else "No content available"

                formatted_results.append(f"""
                    Result {i} (Score: {score}):
                    {content_preview}...
                    Metadata: {metadata}
                """)
                print(f"     🎫 Result {i}: {ticket_id} - {title} (score: {score})")

            result = "\n".join(formatted_results)
            print(f"   📤 Returning {len(result)} characters of search results")
            return result

        except Exception as e:
            error_msg = f"❌ Error searching linear ticket: {str(e)}"
            print(error_msg)  # Also print for debugging
            return error_msg

    return FunctionTool.from_defaults(
        fn=search_func,
        name="search_linear_ticket",
        description="""Search our company's linear tickets using vector similarity search. 
        IMPORTANT: This is a vector database that finds semantically similar ticket chunks, not exact text matching.
        Parameters:
        - query: Search query string
        - k: Number of results to return (default: 5)
        - namespace: Pinecone namespace to search in (default: 'linear-tickets')
        Returns: Content preview and raw metadata for matching tickets with similarity scores.""",
    )


def create_agent_tools(index_name: str) -> List[FunctionTool]:
    return [create_codebase_search_tool(index_name), create_linear_ticket_search_tool(index_name)]
