# agent.py
"""
Generic ReAct agent for querying and analyzing codebase vector stores.
Uses LlamaIndex's ReAct agent framework for enhanced reasoning and transparency.
"""

from typing import Dict, Optional
from llama_index.core.agent.workflow import ReActAgent
from llama_index.llms.openai import OpenAI
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler
from llama_index.core.workflow import Context
from llama_index.core.memory import Memory
import agent.agent_tools as agent_tools
import agent.agent_helpers as agent_helpers
import constants


class Agent:
    """Generic agent for querying and analyzing codebase vector stores."""
    
    def __init__(self, username: str, model: str = "gpt-5-mini", temperature: float = 0.1):
        self.index_name = f"{username}-user-database"

        # Set up debug handler for detailed logging
        llama_debug = LlamaDebugHandler(print_trace_on_end=True)
        callback_manager = CallbackManager([llama_debug])

        # Initialize OpenAI LLM for ReAct agent compatibility
        self.llm = OpenAI(
            model=model,
            api_key=constants.OPENAI_API_KEY,
            temperature=temperature,
            callback_manager=callback_manager,
        )

        # Create tools and agent
        self.tools = agent_tools.create_agent_tools(self.index_name)

        # Create ReAct agent with enhanced reasoning capabilities
        self.agent = ReActAgent(
            tools=self.tools,
            llm=self.llm,
            verbose=True,
            callback_manager=callback_manager,
        )

        # Create context for the agent session
        self.ctx = Context(self.agent)

        # Initialize short-term memory for continuous chat
        self.memory = Memory.from_defaults(session_id=self.index_name)

    async def query(self, prompt: str) -> str:
        """Execute a query against the codebase using the ReAct agent."""
        try:
            print("Starting ReAct agent execution...")

            # Use ReAct agent's run method with context and memory
            handler = self.agent.run(prompt, ctx=self.ctx, memory=self.memory)

            # Get final response
            response = await handler

            return str(response)

        except Exception as e:
            print(f"❌ Error executing query: {str(e)}")
            import traceback
            print(f"   📋 Traceback: {traceback.format_exc()}")
            return f"Error executing query: {str(e)}"