from typing import List
from llama_index.core import VectorStoreIndex
from llama_index.core.tools import FunctionTool
import app.agent.agent_helpers as agent_helpers
import json
import os
from app.agent.video.text_bullet_video import create_text_bullet_video_from_json

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

def create_slack_search_tool(index_name: str) -> FunctionTool:
    def search_func(query: str, k: int = 5) -> str:
        try:
            print("🔍 TOOL CALL: search_slack_messages")
            print(f"   📝 Query: '{query}'")
            print(f"   🔢 Top-k: {k}")

            index = agent_helpers.create_vectorstore_index(index_name, namespace="slack-messages")

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
                channel = metadata.get("channel_id", "Unknown")
                user = metadata.get("user_name", "Unknown user")
                timestamp = metadata.get("timestamp", "Unknown time")

                # Truncate content for preview
                content_preview = content[:500] if content else "No content available"

                formatted_results.append(f"""
                    Result {i} (Score: {score}):
                    Channel: {channel}
                    User: {user}
                    Time: {timestamp}
                    Message: {content_preview}...
                    Metadata: {metadata}
                """)
                print(f"     💬 Result {i}: {channel} - {user} (score: {score})")

            result = "\n".join(formatted_results)
            print(f"   📤 Returning {len(result)} characters of search results")
            return result

        except Exception as e:
            error_msg = f"❌ Error searching slack messages: {str(e)}"
            print(error_msg)  # Also print for debugging
            return error_msg

    return FunctionTool.from_defaults(
        fn=search_func,
        name="search_slack_messages",
        description="""Search our company's Slack messages using vector similarity search. 
        IMPORTANT: This is a vector database that finds semantically similar message chunks, not exact text matching.
        Parameters:
        - query: Search query string
        - k: Number of results to return (default: 5)
        Returns: Message content with channel, user, timestamp and metadata with similarity scores.""",
    )

def create_video_generation_tool() -> FunctionTool:
    def generate_video_func(video_script) -> str:  # Remove type hint to accept any type
        try:
            print("🎬 TOOL CALL: generate_educational_video")
            print(f"   📝 Script type: {type(video_script)}")
            print(f"   📝 Script content: {video_script}")
            
            # Handle different input types (string, dict, AttributedDict)
            if isinstance(video_script, str):
                try:
                    script_data = json.loads(video_script)
                except json.JSONDecodeError as e:
                    return json.dumps({
                        "status": "error",
                        "error": f"Error parsing video script JSON: {str(e)}. Please provide valid JSON."
                    })
            elif hasattr(video_script, '__dict__') or isinstance(video_script, dict):
                # Handle AttributedDict or regular dict
                script_data = dict(video_script) if hasattr(video_script, '__dict__') else video_script
                print(f"   📝 Converted to dict: {script_data}")
            else:
                return json.dumps({
                    "status": "error",
                    "error": f"Unsupported video_script type: {type(video_script)}. Expected string or dict."
                })
            
            # Validate required fields
            required_fields = ["title", "audio", "bullets"]
            for field in required_fields:
                if field not in script_data:
                    return json.dumps({
                        "status": "error",
                        "error": f"Missing required field '{field}' in video script"
                    })
            
            if "narration" not in script_data["audio"]:
                return json.dumps({
                    "status": "error",
                    "error": "Missing 'narration' in audio section"
                })
            
            if not isinstance(script_data["bullets"], list) or len(script_data["bullets"]) == 0:
                return json.dumps({
                    "status": "error",
                    "error": "'bullets' must be a non-empty list"
                })
            
            # Create a temporary JSON file
            script_hash = hash(str(script_data))  # Use string representation for hash
            temp_script_file = f"temp_video_script_{script_hash}.json"
            
            try:
                # Write the script to a temporary file
                with open(temp_script_file, 'w') as f:
                    json.dump(script_data, f, indent=2)
                
                print(f"   🎥 Creating video from script: {script_data['title']}")
                print(f"   🔊 Narration: {len(script_data['audio']['narration'])} characters")
                print(f"   📋 Bullet points: {len(script_data['bullets'])}")
                
                # Generate the video
                result = create_text_bullet_video_from_json(
                    temp_script_file, 
                    output_filename=f"lesson_video_{script_hash}.mp4",
                    upload_to_imgur_flag=True
                )
                
                if result and result.get("imgur_link"):
                    print(f"   ✅ Video generated and uploaded successfully!")
                    return json.dumps({
                        "status": "success",
                        "video_url": result["imgur_link"],
                        "local_path": result.get("local_path")
                    })
                elif result and result.get("local_path"):
                    print(f"   ⚠️ Video created but upload failed")
                    return json.dumps({
                        "status": "partial_success",
                        "video_url": None,
                        "local_path": result.get("local_path"),
                        "error": "Upload failed"
                    })
                else:
                    print(f"   ❌ Video generation failed")
                    return json.dumps({
                        "status": "error",
                        "error": "Video generation failed. Please check the script format and try again."
                    })
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_script_file):
                    os.remove(temp_script_file)
                    
        except Exception as e:
            error_msg = f"Error generating video: {str(e)}"
            print(error_msg)
            return json.dumps({
                "status": "error",
                "error": error_msg
            })
    
    return FunctionTool.from_defaults(
        fn=generate_video_func,
        name="generate_educational_video",
        description="""Generate an educational video with narration and bullet points for lesson content.
        IMPORTANT: This tool should ONLY be used when creating lessons, not for general chat or other purposes.
        
        Input: JSON string with this exact structure:
        {
            "title": "Video title",
            "audio": {
                "narration": "Full narration text that will be spoken",
                "language": "en" (optional, defaults to "en")
            },
            "bullets": [
                {"text": "First key point"},
                {"text": "Second key point"},
                {"text": "Third key point"}
            ],
            "timing": {
                "bullet_appear_duration": 0.8,
                "bullet_highlight_duration": 2.5,
                "pause_between_bullets": 0.5,
                "final_pause": 2.0
            }
        }
        
        Returns: JSON string with fields: 
        {{"status": "success|partial_success|error", "video_url": string|null, "local_path": string|null, "error": string|null}}
        The video will have synchronized narration with animated bullet points appearing one by one."""
    )

def create_agent_tools(index_name: str) -> List[FunctionTool]:
    return [
        create_codebase_search_tool(index_name), 
        create_linear_ticket_search_tool(index_name),
        create_slack_search_tool(index_name)
    ]

def create_lesson_agent_tools(index_name: str) -> List[FunctionTool]:
    """Create tools specifically for lesson generation, including video generation."""
    return [
        create_codebase_search_tool(index_name), 
        create_linear_ticket_search_tool(index_name),
        create_slack_search_tool(index_name),
        create_video_generation_tool()
    ]