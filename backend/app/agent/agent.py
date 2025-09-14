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
import app.agent.agent_tools as agent_tools
import app.agent.agent_helpers as agent_helpers
import app.constants as constants


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
            system_prompt=self._get_system_prompt(),
        )

        # Create context for the agent session
        self.ctx = Context(self.agent)

        # Initialize short-term memory for continuous chat
        self.memory = Memory.from_defaults(session_id=self.index_name)

    def _get_system_prompt(self) -> str:
        """Get the system prompt for the main agent with tool call limits."""
        return """You are an AI learning assistant that helps generate educational content by researching codebases, Linear tickets, and Slack messages.

Your capabilities:
- Search through codebases to find relevant code patterns and implementations (search_codebase)
- Look up Linear tickets to understand project requirements and issues (search_linear_ticket)  
- Search Slack messages to find team discussions and decisions (search_slack_messages)
- Generate educational videos with narration and bullet points (create_educational_video)

CRITICAL TOOL USAGE LIMITS:
- You are LIMITED to a MAXIMUM of 8 total informational tool calls (search_codebase, search_linear_ticket, search_slack_messages combined)
- After 8 informational tool calls, you MUST proceed to generate videos and provide your final response
- Video generation (create_educational_video) does NOT count toward this limit
- Plan your searches strategically to gather the most important information within this limit

Search Strategy Guidelines:
1. Start with the most important/broad searches first
2. Use diverse search terms to maximize information gathering
3. Focus on searches that will give you the most educational value
4. Don't waste calls on overly specific or redundant searches
5. After 6-7 searches, start preparing to create videos and finalize your response

BULLET POINT CREATION FOR CODE CONTENT:
When creating bullet points for technical/code content, focus ONLY on what developers actually need to know:
- Extract only the most critical implementation details
- Focus on practical, actionable information
- Avoid verbose explanations or background context
- Each bullet should be 4-8 words maximum
- Prioritize: patterns used, key decisions, gotchas, production considerations

GOOD examples for code slides:
- "Uses JWT tokens (24h expiry)"
- "Implements refresh token rotation"
- "Handles mobile network failures"
- "Centralized 401 retry logic"

BAD examples (too verbose):
- "Advanced implementation notes and production considerations found in tickets"
- "The team used short-lived JWTs and shipped FRT-3 to implement refresh token usage"

When you reach the 8-call limit:
- IMMEDIATELY stop making informational tool calls
- Proceed to create educational videos using the create_educational_video tool
- Provide your final response based on the information you've gathered
- Do not ask for permission or indicate you need more searches - work with what you have

Remember: Quality over quantity - make each tool call count toward creating the best possible educational content."""

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