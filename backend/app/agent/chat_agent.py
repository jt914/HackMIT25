# chat_agent.py
"""
Specialized ReAct agent for chat interactions.
This agent can search and retrieve information but cannot generate lessons or videos.
Optimized for conversational Q&A about codebases, Linear tickets, and Slack messages.
"""

from typing import Dict, Optional
from llama_index.core.agent.workflow import ReActAgent
from llama_index.llms.openai import OpenAI
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler
from llama_index.core.workflow import Context
from llama_index.core.memory import Memory
import app.agent.agent_tools as agent_tools
import app.agent.agent_helpers as agent_helpers
import app.constants as constants


class ChatAgent:
    """Specialized agent for chat interactions - can search and answer questions but cannot create lessons."""
    
    def __init__(self, username: str, model: str = "gpt-4o-mini", temperature: float = 0.2):
        self.index_name = f"{username}-user-database"

        # Set up debug handler for detailed logging
        llama_debug = LlamaDebugHandler(print_trace_on_end=True)
        callback_manager = CallbackManager([llama_debug])

        # Initialize OpenAI LLM for ReAct agent compatibility
        # Using slightly higher temperature for more conversational responses
        self.llm = OpenAI(
            model=model,
            api_key=constants.OPENAI_API_KEY,
            temperature=temperature,
            callback_manager=callback_manager,
        )

        # Create chat-specific tools (no video generation)
        self.tools = agent_tools.create_chat_agent_tools(self.index_name)

        # Create ReAct agent with enhanced reasoning capabilities
        self.agent = ReActAgent(
            tools=self.tools,
            llm=self.llm,
            verbose=True,
            callback_manager=callback_manager,
            system_prompt=self._get_chat_system_prompt(),
        )

        # Create context for the agent session
        self.ctx = Context(self.agent)

        # Initialize short-term memory for continuous chat
        self.memory = Memory.from_defaults(session_id=self.index_name)

    def _get_chat_system_prompt(self) -> str:
        """Get the system prompt for the chat agent."""
        return """You are a helpful AI debugging assistant that guides users through investigating their own code issues.

**Your Role**: Help users debug and understand their code by guiding them through the investigation process, NOT by trying to fix issues yourself.

**Available Tools**:
- Search codebases for relevant implementations
- Look up Linear tickets for project context  
- Search Slack messages for team discussions

**CRITICAL TOOL USAGE LIMITS**:
- You are LIMITED to a MAXIMUM of 10 total tool calls per conversation
- After reaching 8 tool calls, start preparing your final response
- After 12 tool calls, you MUST provide your final answer based on the information gathered
- Plan your searches strategically to maximize information gathering within this limit
- If you reach the limit, answer to the best of your ability with the information you have

**Response Guidelines**:
- **CRITICAL: Maximum 2-3 sentences total** - Be extremely concise
- **Guide, don't fix**: Ask clarifying questions and suggest debugging steps
- **Use proper markdown**: Headers, code blocks, and bullet points only when essential
- **Be specific**: Reference actual code/files when found
- **Focus on answering the exact question asked** - No lengthy explanations

**Response Format** (use only when needed):
```markdown
Brief answer in 1-2 sentences. Ask one focused follow-up question if needed.
```

**Remember**: Your job is to help them investigate and learn, not to provide complete solutions. Keep responses extremely focused and actionable - MAXIMUM 2-3 SENTENCES TOTAL."""

    async def query(self, prompt: str) -> str:
        """Execute a chat query against the available data sources."""
        try:
            print("Starting ChatAgent execution...")

            # Use ReAct agent's run method with context and memory
            handler = self.agent.run(prompt, ctx=self.ctx, memory=self.memory)

            # Get final response
            response = await handler

            return str(response)

        except Exception as e:
            print(f"❌ Error executing chat query: {str(e)}")
            import traceback
            print(f"   📋 Traceback: {traceback.format_exc()}")
            return f"I'm sorry, I encountered an error while processing your question: {str(e)}. Please try rephrasing your question or ask something else."
