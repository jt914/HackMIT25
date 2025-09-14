# interactive_lesson_service.py
"""
Service for generating and managing interactive lesson sessions.
Creates investigative lessons based on past team issues from codebase, Linear, and Slack.
"""

from typing import Dict, Optional, List, Tuple
from app.agent.agent import Agent
from app.models import InteractiveLessonSession
from app.api_clients.mongo import mongo_client
import json
import uuid
from datetime import datetime
import re


class InteractiveLessonService:
    """Service for generating and managing interactive investigative lessons."""
    
    def __init__(self, username: str):
        self.agent = Agent(username=username, temperature=0.3)
        self.username = username
    
    async def create_lesson_session(self, user_email: str, topic: Optional[str] = None) -> InteractiveLessonSession:
        """Create a new interactive lesson session by finding an interesting past issue."""
        
        print(f"\n🕵️ Creating interactive lesson session for: {user_email}")
        print(f"📝 Topic focus: {topic if topic else 'Any interesting issue'}")
        
        try:
            # Generate the investigation problem
            problem_data = await self._generate_investigation_problem(topic)
            
            # Create session object
            session = InteractiveLessonSession(
                id=str(uuid.uuid4()),
                user_email=user_email,
                problem_title=problem_data["title"],
                problem_description=problem_data["description"],
                problem_context=problem_data["context"],
                solution=problem_data["solution"],
                current_state="investigating",
                hints_given=0,
                chat_history=[],
                created_at=datetime.utcnow()
            )
            
            # Save session to MongoDB
            session_dict = session.model_dump()
            mongo_client.save_interactive_lesson_session(session_dict)
            
            print("✅ Interactive lesson session created successfully!")
            return session
            
        except Exception as e:
            print(f"❌ Error creating interactive lesson session: {str(e)}")
            raise e
    
    async def _generate_investigation_problem(self, topic: Optional[str] = None) -> Dict[str, str]:
        """Generate an investigation problem based on past team issues."""
        
        # Build search prompt to find interesting issues
        search_prompt = self._build_problem_search_prompt(topic)
        
        print("🔍 Searching for interesting past issues...")
        response = await self.agent.query(search_prompt)
        
        # Parse the response to extract problem data
        problem_data = self._parse_problem_response(response)
        
        return problem_data
    
    def _build_problem_search_prompt(self, topic: Optional[str] = None) -> str:
        """Build a prompt to search for interesting past issues."""
        
        base_topic = topic if topic else "any interesting technical issue or bug"
        
        prompt = f"""
        MISSION: Find an interesting past issue that would make a great investigative lesson.
        
        ⚠️ CRITICAL TOOL LIMIT: You have a MAXIMUM of 8 total informational tool calls (search_codebase + search_linear_ticket + search_slack_messages). After 8 calls, you MUST proceed to problem generation. Plan strategically!
        
        MANDATORY SEARCH STEPS - WORK WITHIN THE 8-CALL LIMIT:
        
        STEP 1: SEARCH LINEAR TICKETS (RECOMMENDED 3-4 SEARCHES)
        Search for interesting issues, bugs, or technical challenges:
        - Search 1: "{base_topic}" 
        - Search 2: "bug" OR "error" OR "issue" OR "problem"
        - Search 3: "fix" OR "solution" OR "resolved" OR "implemented"
        - Search 4: Additional relevant terms if within limit
        
        STEP 2: SEARCH CODEBASE (RECOMMENDED 2-3 SEARCHES) 
        Look for related code that might be involved:
        - Search 1: "{base_topic}"
        - Search 2: Related technical terms from Linear tickets
        - Search 3: Additional code patterns if within limit
        
        STEP 3: SEARCH SLACK MESSAGES (RECOMMENDED 1-2 SEARCHES)
        Look for team discussions about issues:
        - Search 1: "{base_topic}"
        - Search 2: "bug" OR "issue" OR "problem" OR "help" OR "broken"
        
        ANALYSIS CRITERIA:
        Look for issues that are:
        ✅ Technical and specific (not just feature requests)
        ✅ Have clear problem description and resolution
        ✅ Involve interesting debugging or investigation
        ✅ Have team discussion/collaboration around the solution
        ✅ Educational - would help others learn about our system
        
        AVOID:
        ❌ Simple typos or trivial fixes
        ❌ Issues without clear resolution
        ❌ Pure feature requests without technical challenges
        ❌ Issues that are too complex for a lesson
        
        REQUIRED OUTPUT FORMAT - Respond with JSON only:
        {{
            "title": "Brief, engaging title for the investigation (max 60 chars)",
            "description": "Present the problem as it would have appeared initially. Don't reveal the solution. Describe symptoms, error messages, or unexpected behavior. Make it sound like a real issue someone would investigate. 2-3 sentences max.",
            "context": "Relevant background information from your searches. Include: relevant code snippets, system architecture details, related components, team discussions. This should give enough context for investigation without revealing the solution. 3-4 sentences max.",
            "solution": "The actual solution/resolution that was implemented. Include: what was wrong, how it was fixed, key insights, code changes made. This will be revealed only when the user solves it or gives up. 2-3 sentences max.",
            "search_summary": "Brief summary of what you found in your searches that led to this problem selection."
        }}
        
        IMPORTANT: The description should present the problem as a mystery to be solved, not reveal what caused it or how it was fixed.
        """
        
        return prompt
    
    def _parse_problem_response(self, response: str) -> Dict[str, str]:
        """Parse the agent response and extract problem data."""
        try:
            # Clean the response to extract JSON
            response = response.strip()
            
            # Remove markdown code blocks if present
            if response.startswith("```json"):
                response = response[7:]
            elif response.startswith("```"):
                response = response[3:]
                
            if response.endswith("```"):
                response = response[:-3]
                
            response = response.strip()
            
            # Parse JSON
            problem_data = json.loads(response)
            
            # Validate required fields
            required_fields = ["title", "description", "context", "solution"]
            for field in required_fields:
                if field not in problem_data:
                    raise ValueError(f"Missing required field: {field}")
            
            
            return problem_data
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse problem JSON: {e}")
            print(f"Raw response: {response}")
            raise ValueError(f"Failed to parse problem response as JSON: {str(e)}")
    
    
    async def handle_chat_message(self, session: InteractiveLessonSession, message: str) -> Tuple[str, bool, bool, bool]:
        """
        Handle a chat message in an interactive lesson session.
        
        Returns: (response, is_correct, hint_provided, session_completed)
        """
        
        print(f"\n💬 Handling chat message in session {session.id}")
        print(f"📝 Message: {message}")
        print(f"🎯 Current state: {session.current_state}")
        
        # Check if user is giving up
        if self._is_giving_up(message):
            session.current_state = "given_up"
            session.completed_at = datetime.utcnow()
            response = f"No worries! Here's what actually happened:\n\n{session.solution}\n\nThis was a great learning opportunity - these kinds of issues help us understand our system better!"
            return response, False, False, True
        
        # Check if the user has the correct answer
        is_correct = await self._check_solution(session, message)
        
        if is_correct:
            session.current_state = "solved"
            session.completed_at = datetime.utcnow()
            response = f"🎉 Excellent work! You've solved it!\n\n{session.solution}\n\nGreat investigation skills - this is exactly how our team approaches these kinds of issues!"
            return response, True, False, True
        
        # Generate a helpful response with optional hint
        response, hint_provided = await self._generate_investigative_response(session, message)
        
        if hint_provided:
            session.hints_given += 1
        
        return response, False, hint_provided, False
    
    def _is_giving_up(self, message: str) -> bool:
        """Check if the user is giving up."""
        give_up_phrases = [
            "i give up", "give up", "i don't know", "no idea", 
            "can't figure", "show me the answer", "what's the solution",
            "i'm stuck", "tell me the answer", "reveal the solution"
        ]
        
        message_lower = message.lower()
        return any(phrase in message_lower for phrase in give_up_phrases)
    
    async def _check_solution(self, session: InteractiveLessonSession, message: str) -> bool:
        """Check if the user's message contains the correct solution."""
        
        # Build a prompt to check if the user's answer is correct
        check_prompt = f"""
        TASK: Determine if the user has FULLY SOLVED this problem with a complete understanding.
        
        PROBLEM CONTEXT:
        {session.problem_description}
        
        ACTUAL SOLUTION:
        {session.solution}
        
        USER'S ANSWER:
        {message}
        
        STRICT EVALUATION CRITERIA - ALL MUST BE MET:
        1. Does the user identify the EXACT root cause mentioned in the solution?
        2. Do they explain WHY this caused the problem?
        3. Do they describe the SPECIFIC fix that was implemented?
        4. Do they demonstrate understanding of the technical details?
        5. Is this a complete solution explanation, not just a question or partial insight?
        6. Is their response at least 50 words and contains multiple sentences?
        7. Do they use technical terminology correctly?
        
        CRITICAL GUIDELINES:
        - Questions (ending with ?) are NEVER solutions - always mark INCORRECT
        - Single sentences or short responses are NEVER solutions - always mark INCORRECT
        - Partial insights, guesses, or "maybe it's..." statements are NOT solutions
        - Only mark CORRECT if they provide a comprehensive multi-sentence explanation
        - They must explain BOTH the problem AND the solution in detail
        - Be EXTREMELY STRICT - err on the side of marking INCORRECT
        
        EXAMPLES OF INCORRECT RESPONSES:
        - "What error messages are we seeing?"
        - "Is it a database issue?"
        - "Maybe it's the authentication service?"
        - "The API seems broken"
        - "Something with the email system?"
        
        EXAMPLES OF CORRECT RESPONSES:
        - "The root cause was [specific technical issue] which happened because [explanation]. The fix was to [specific solution] which resolved it by [how it works]."
        
        RESPOND WITH ONLY: "CORRECT" or "INCORRECT"
        """
        
        try:
            response = await self.agent.query(check_prompt)
            print(f"🤖 Agent solution check response: {response}")
            
            # More robust parsing - look for the exact response format
            response_upper = response.upper().strip()
            
            # Check if the response starts with "CORRECT" or is exactly "CORRECT"
            if response_upper.startswith("CORRECT"):
                return True
            elif response_upper.startswith("INCORRECT"):
                return False
            else:
                # If the response doesn't match expected format, be conservative and return False
                print(f"⚠️ Unexpected agent response format: {response}")
                return False
                
        except Exception as e:
            print(f"Error checking solution: {e}")
            return False
    
    async def _generate_investigative_response(self, session: InteractiveLessonSession, message: str) -> Tuple[str, bool]:
        """Generate a helpful investigative response, optionally providing a hint and discovering evidence."""
        
        # Determine if we should provide a hint based on conversation length and previous hints
        should_provide_hint = self._should_provide_hint(session, message)
        
        response_prompt = f"""
        CONTEXT: You are helping a developer investigate this issue:
        
        PROBLEM: {session.problem_description}
        
        BACKGROUND: {session.problem_context}
        
        ACTUAL SOLUTION (DO NOT REVEAL): {session.solution}
        
        USER'S LATEST MESSAGE: {message}
        
        HINTS GIVEN SO FAR: {session.hints_given}
        
        CHAT HISTORY: {json.dumps(session.chat_history[-5:], indent=2) if session.chat_history else "No previous messages"}
        
        RESPONSE GUIDELINES:
        
        {"PROVIDE A HINT: Give a subtle hint that guides them toward the solution. Don't reveal the answer directly." if should_provide_hint else "NO HINT: Respond helpfully but don't give away the solution yet."}
        
        INVESTIGATION COACHING:
        - Act like a helpful senior developer who wants them to learn through investigation
        - If they ask basic questions (like "what error messages"), provide specific technical details to help them dig deeper
        - Encourage them to use investigation tools by suggesting specific approaches
        - Guide them toward evidence collection rather than jumping to conclusions
        - Ask probing follow-up questions to deepen their understanding
        - Acknowledge good investigative thinking and redirect if they're off track
        - Reference the context and background information appropriately
        - Don't accept simple guesses - push them to provide evidence and reasoning
        
        IMPORTANT: If they're asking investigative questions, provide concrete technical information (error logs, code snippets, system details) rather than just encouragement. Make them feel like they're actually investigating a real system.
        
        TONE: Encouraging, collaborative, like a helpful teammate who values thorough investigation
        
        RESPOND WITH ONLY YOUR MESSAGE - NO FORMATTING OR LABELS
        """
        
        try:
            response = await self.agent.query(response_prompt)
            return response.strip(), should_provide_hint
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I'm having trouble processing that. Can you try rephrasing your question?", False
    
    def _should_provide_hint(self, session: InteractiveLessonSession, message: str) -> bool:
        """Determine if we should provide a hint based on session state."""
        
        # Provide hint if:
        # - They've been investigating for a while (5+ messages)
        # - They explicitly ask for a hint
        # - They seem stuck (repeated similar questions)
        # - They haven't had a hint in the last 3 messages
        
        message_lower = message.lower()
        hint_requests = ["hint", "clue", "help", "stuck", "not sure", "any ideas"]
        
        explicit_hint_request = any(phrase in message_lower for phrase in hint_requests)
        
        # Check conversation length
        conversation_length = len(session.chat_history)
        
        # Provide hints every 4-5 messages or on explicit request
        return (
            explicit_hint_request or 
            (conversation_length >= 4 and conversation_length % 4 == 0) or
            (conversation_length >= 8 and session.hints_given < 2)
        )
    
    
    def get_session(self, session_id: str, user_email: str) -> Optional[InteractiveLessonSession]:
        """Get an interactive lesson session by ID."""
        try:
            session_data = mongo_client.get_interactive_lesson_session(session_id, user_email)
            if not session_data:
                return None
            
            return InteractiveLessonSession(**session_data)
        except Exception as e:
            print(f"Error getting session: {e}")
            return None
    
    def update_session(self, session: InteractiveLessonSession):
        """Update an interactive lesson session."""
        try:
            session_dict = session.model_dump()
            mongo_client.update_interactive_lesson_session(session_dict)
        except Exception as e:
            print(f"Error updating session: {e}")
            raise e
    
    async def handle_slide_message(self, slide_data: dict, message: str) -> Tuple[str, bool, bool, bool]:
        """
        Handle a chat message for an interactive investigation slide.
        
        Returns: (response, is_correct, hint_provided, investigation_completed)
        """
        
        print(f"\n💬 Handling slide message")
        print(f"📝 Message: {message}")
        print(f"🎯 Current state: {slide_data.get('current_state', 'investigating')}")
        
        # Check if user is giving up
        if self._is_giving_up(message):
            response = f"No worries! Here's what actually happened:\n\n{slide_data['solution']}\n\nThis was a great learning opportunity - these kinds of issues help us understand our system better!"
            return response, False, False, True
        
        # Check if the user has the correct answer
        is_correct = await self._check_slide_solution(slide_data, message)
        
        if is_correct:
            response = f"🎉 Excellent work! You've solved it!\n\n{slide_data['solution']}\n\nGreat investigation skills - this is exactly how our team approaches these kinds of issues!"
            return response, True, False, True
        
        # Generate a helpful response with optional hint
        response, hint_provided = await self._generate_slide_response(slide_data, message)
        
        return response, False, hint_provided, False
    
    async def _check_slide_solution(self, slide_data: dict, message: str) -> bool:
        """Check if the user's message contains the correct solution for a slide."""
        
        # Build a prompt to check if the user's answer is correct
        check_prompt = f"""
        TASK: Determine if the user has FULLY SOLVED this problem with a complete understanding.
        
        PROBLEM CONTEXT:
        {slide_data['problem_description']}
        
        ACTUAL SOLUTION:
        {slide_data['solution']}
        
        USER'S ANSWER:
        {message}
        
        STRICT EVALUATION CRITERIA - ALL MUST BE MET:
        1. Does the user identify the EXACT root cause mentioned in the solution?
        2. Do they explain WHY this caused the problem?
        3. Do they describe the SPECIFIC fix that was implemented?
        4. Do they demonstrate understanding of the technical details?
        5. Is this a complete solution explanation, not just a question or partial insight?
        6. Is their response at least 50 words and contains multiple sentences?
        7. Do they use technical terminology correctly?
        
        CRITICAL GUIDELINES:
        - Questions (ending with ?) are NEVER solutions - always mark INCORRECT
        - Single sentences or short responses are NEVER solutions - always mark INCORRECT
        - Partial insights, guesses, or "maybe it's..." statements are NOT solutions
        - Only mark CORRECT if they provide a comprehensive multi-sentence explanation
        - They must explain BOTH the problem AND the solution in detail
        - Be EXTREMELY STRICT - err on the side of marking INCORRECT
        
        EXAMPLES OF INCORRECT RESPONSES:
        - "What error messages are we seeing?"
        - "Is it a database issue?"
        - "Maybe it's the authentication service?"
        - "The API seems broken"
        - "Something with the email system?"
        
        EXAMPLES OF CORRECT RESPONSES:
        - "The root cause was [specific technical issue] which happened because [explanation]. The fix was to [specific solution] which resolved it by [how it works]."
        
        RESPOND WITH ONLY: "CORRECT" or "INCORRECT"
        """
        
        try:
            response = await self.agent.query(check_prompt)
            print(f"🤖 Agent slide solution check response: {response}")
            
            # More robust parsing - look for the exact response format
            response_upper = response.upper().strip()
            
            # Check if the response starts with "CORRECT" or is exactly "CORRECT"
            if response_upper.startswith("CORRECT"):
                return True
            elif response_upper.startswith("INCORRECT"):
                return False
            else:
                # If the response doesn't match expected format, be conservative and return False
                print(f"⚠️ Unexpected agent response format in slide check: {response}")
                return False
                
        except Exception as e:
            print(f"Error checking slide solution: {e}")
            return False
    
    async def _generate_slide_response(self, slide_data: dict, message: str) -> Tuple[str, bool]:
        """Generate a helpful investigative response for a slide, optionally providing a hint."""
        
        # Determine if we should provide a hint based on conversation length and previous hints
        should_provide_hint = self._should_provide_slide_hint(slide_data, message)
        
        response_prompt = f"""
        CONTEXT: You are helping a developer investigate this issue:
        
        PROBLEM: {slide_data['problem_description']}
        
        BACKGROUND: {slide_data['problem_context']}
        
        ACTUAL SOLUTION (DO NOT REVEAL): {slide_data['solution']}
        
        USER'S LATEST MESSAGE: {message}
        
        HINTS GIVEN SO FAR: {slide_data.get('hints_given', 0)}
        
        CHAT HISTORY: {json.dumps(slide_data.get('chat_history', [])[-5:], indent=2) if slide_data.get('chat_history') else "No previous messages"}
        
        RESPONSE GUIDELINES:
        
        {"PROVIDE A HINT: Give a subtle hint that guides them toward the solution. Don't reveal the answer directly." if should_provide_hint else "NO HINT: Respond helpfully but don't give away the solution yet."}
        
        CRITICAL RESPONSE FORMAT:
        - MAXIMUM 2-3 sentences only
        - Be direct and focused - answer their exact question
        - If providing technical details, be specific but concise
        - No lengthy explanations or coaching paragraphs
        
        INVESTIGATION APPROACH:
        - Act like a helpful senior developer giving quick, focused guidance
        - Provide specific technical details when asked (error logs, code snippets) in 1-2 sentences
        - Ask one focused follow-up question if needed to guide investigation
        - Acknowledge their thinking briefly and redirect if off track
        
        TONE: Direct, helpful, concise - like a busy but supportive teammate
        
        RESPOND WITH ONLY YOUR MESSAGE - NO FORMATTING OR LABELS - MAXIMUM 2-3 SENTENCES
        """
        
        try:
            response = await self.agent.query(response_prompt)
            return response.strip(), should_provide_hint
        except Exception as e:
            print(f"Error generating slide response: {e}")
            return "I'm having trouble processing that. Can you try rephrasing your question?", False
    
    def _should_provide_slide_hint(self, slide_data: dict, message: str) -> bool:
        """Determine if we should provide a hint based on slide state."""
        
        message_lower = message.lower()
        hint_requests = ["hint", "clue", "help", "stuck", "not sure", "any ideas"]
        
        explicit_hint_request = any(phrase in message_lower for phrase in hint_requests)
        
        # Check conversation length
        conversation_length = len(slide_data.get('chat_history', []))
        
        # Provide hints every 4-5 messages or on explicit request
        return (
            explicit_hint_request or 
            (conversation_length >= 4 and conversation_length % 4 == 0) or
            (conversation_length >= 8 and slide_data.get('hints_given', 0) < 2)
        )
