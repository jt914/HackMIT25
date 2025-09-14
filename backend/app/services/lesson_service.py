# lesson_service.py
"""
Service for generating bite-sized lessons with MCQ and drag-drop questions.
"""

from typing import Dict, Optional
from app.agent.agent import Agent
from app.models import Lesson, InfoSlide, VideoSlide, MCQQuestion, MCQOption, DragDropQuestion, DragDropItem, InteractiveInvestigationSlide
from app.services.interactive_lesson_service import InteractiveLessonService
import json
import uuid
from datetime import datetime


class LessonGeneratorService:
    """Service for generating bite-sized interactive lessons."""
    
    def __init__(self, username: str):
        self.agent = Agent(username=username, temperature=0.3)
        self.interactive_service = InteractiveLessonService(username)
        # Note: Agent now includes video generation tool by default
    
    async def generate_lesson(self, query: str, user_email: str) -> Lesson:
        """Generate a bite-sized lesson based on user query."""
        # Build the lesson generation prompt
        prompt = self._build_lesson_prompt(query)
        
        print(f"\n🎓 Generating bite-sized lesson for: {query}")
        print("📚 Creating 6-8 focused slides with videos and detective scenario...")
        
        try:
            # Use the agent to generate lesson content with detective scenario
            response = await self.agent.query(prompt)
            
            # Parse the JSON response
            lesson_data = self._parse_lesson_response(response)
            
            # Create lesson object with proper structure
            lesson = self._create_lesson_object(lesson_data, query, user_email)
            
            # Add interactive detective scenario from unified response
            if "detective_scenario" in lesson_data:
                detective_slide = self._create_detective_slide_from_data(lesson_data["detective_scenario"])
                lesson.slides.append(detective_slide)
                print("🕵️ Added interactive detective scenario to lesson")
            else:
                print("⚠️ No detective scenario found in response")
            
            print("✅ Lesson generated successfully!")
            return lesson
            
        except Exception as e:
            print(f"❌ Error generating lesson: {str(e)}")
            raise e
    
    def _build_lesson_prompt(self, query: str) -> str:
        """Build a prompt for generating bite-sized lessons based on actual codebase and Linear issues."""
        
        prompt = f"""
        STOP! READ THIS CAREFULLY BEFORE PROCEEDING:
        
        You are about to create a focused, practical lesson about: "{query}"
        
        MANDATORY RESEARCH PHASE - UNDERSTAND THE TOPIC FIRST:
        
        ⚠️ CRITICAL TOOL LIMIT: You have a MAXIMUM of 8 total informational tool calls (search_codebase + search_linear_ticket + search_slack_messages). After 8 calls, you MUST proceed to video generation and lesson creation. Plan strategically!
        
        STEP 1: EXPLORE THE CODEBASE (RECOMMENDED 3-4 SEARCHES)
        Use the search_codebase tool to understand how we implement "{query}":
        - Search for the main topic: "{query}"
        - Search for related technical concepts and implementation details
        - Search for architectural patterns and components involved
        - Use your judgment to search for additional relevant terms
        
        STEP 2: UNDERSTAND TEAM CONTEXT (RECOMMENDED 2-3 SEARCHES) 
        Use the search_linear_ticket tool to understand real-world challenges:
        - Search for "{query}" to find related discussions and decisions
        - Search for related issues, bugs, or improvements
        - Look for team decisions and lessons learned
        
        STEP 3: OPTIONAL SLACK CONTEXT (RECOMMENDED 1-2 SEARCHES)
        Use the search_slack_messages tool if helpful for understanding team discussions
        
        STEP 4: SYNTHESIZE YOUR UNDERSTANDING
        Based on your research, determine:
        - What are the most important concepts someone should understand about "{query}"?
        - What real challenges has our team faced with "{query}"?
        - What would be most valuable for a developer to learn?
        - How should you structure the lesson for maximum impact?
        
        YOUR AUTONOMY AS AN EDUCATOR:
        - YOU decide what concepts are most important to cover
        - YOU determine the best order to present information
        - YOU choose which aspects deserve video explanations vs. text
        - YOU structure the lesson flow based on the complexity and nature of the topic
        - Focus on practical understanding over comprehensive coverage
        
        LESSON STRUCTURE:
        - Total slides: 6-8 slides (shorter, focused lessons)
        - Pattern: video → code slide → video → code slide → 2-3 questions → investigation
        - AI has flexibility to adjust this pattern as needed (can add/remove slides based on topic complexity)
        - Slide types: Video slides, Info slides (for code), Multiple choice (MCQ), and drag-and-drop
        - Each slide should be densely packed with useful, challenging but solvable information
        - Video slides should explain high-level concepts that help developers start shipping code
        - Info slides should contain practical code examples and implementation details
        - ALL CONTENT MUST BE BASED ON YOUR TOOL SEARCH RESULTS
        - Focus on practical understanding that enables immediate productivity
        
        CRITICAL OUTPUT FORMAT: You MUST respond with a valid JSON object in this exact structure:
        {{
            "title": "Generate a concise, descriptive title (5-8 words) that captures the key learning outcome. Extract the core concept from the user query and create a grammatically correct title. For 'Teach me about user authentication' → 'User Authentication Fundamentals', for 'How does our API work' → 'API Architecture Overview', for 'Database optimization' → 'Database Optimization Techniques'",
            "description": "Interactive lesson covering core concepts and practical implementation (10-15 words max, no file names)",
            "slides": [
                {{
                    "type": "video",
                    "id": "video_1", 
                    "title": "Core Concepts Overview",
                    "description": "Foundational concepts developers need to understand to be productive",
                    "video_url": "GENERATED_BY_TOOL",
                    "duration_seconds": null
                }},
                {{
                    "type": "info",
                    "id": "code_1",
                    "title": "Implementation Deep Dive",
                    "content": "REPLACE WITH ACTUAL CONTENT: Write 3-4 concise bullet points based on your search results. Each bullet should be one key insight (max 15 words). Focus on: • Key implementation pattern • Error handling approach • Production consideration • Best practice from codebase",
                    "code_snippet": "// Short, focused code snippet (max 10 lines)\nfunction keyPattern() {{\n  // Essential implementation only\n  // Core logic, no verbose comments\n}}",
                    "image_url": null
                }},
                {{
                    "type": "video",
                    "id": "video_2",
                    "title": "Architecture and Design Patterns",
                    "description": "How components work together and key architectural decisions",
                    "video_url": "GENERATED_BY_TOOL", 
                    "duration_seconds": null
                }},
                {{
                    "type": "info",
                    "id": "code_2",
                    "title": "Advanced Patterns and Edge Cases",
                    "content": "REPLACE WITH ACTUAL CONTENT: Write 3-4 concise bullet points based on your search results. Each bullet should be one key insight (max 15 words). Focus on: • Edge case handling • Performance optimization • Common pitfall • Debugging tip from codebase",
                    "code_snippet": "// Concise code example (max 8 lines)\nfunction handleEdgeCase() {{\n  // Key pattern only\n  // Essential error handling\n}}",
                    "image_url": null
                }},
                {{
                    "type": "mcq",
                    "id": "question_1",
                    "question": "REPLACE WITH ACTUAL QUESTION: Create a specific question about {query} based on your search results. Focus on critical decisions developers face when implementing {query} in production.",
                    "options": [
                        {{"id": "opt_1", "text": "REPLACE: Option 1 specific to {query} from search results"}},
                        {{"id": "opt_2", "text": "REPLACE: Option 2 based on codebase patterns for {query}"}},
                        {{"id": "opt_3", "text": "REPLACE: Option 3 from team practices with {query}"}},
                        {{"id": "opt_4", "text": "REPLACE: Option 4 related to {query} implementation"}}
                    ],
                    "correct_answer_id": "opt_1",
                    "explanation": "REPLACE WITH ACTUAL EXPLANATION: Explain why this is the correct answer based on your actual search results. Reference specific files, patterns, or decisions found in the codebase."
                }},
                {{
                    "type": "mcq",
                    "id": "question_2",
                    "question": "REPLACE WITH ACTUAL QUESTION: Create a specific question about {query} based on your Linear ticket searches. Focus on production issues or priorities related to {query} that the team has actually faced.",
                    "options": [
                        {{"id": "opt_1", "text": "REPLACE: Option 1 based on Linear tickets about {query}"}},
                        {{"id": "opt_2", "text": "REPLACE: Option 2 from production issues with {query}"}},
                        {{"id": "opt_3", "text": "REPLACE: Option 3 from team discussions about {query}"}},
                        {{"id": "opt_4", "text": "REPLACE: Option 4 from {query} implementation challenges"}}
                    ],
                    "correct_answer_id": "opt_2", 
                    "explanation": "REPLACE WITH ACTUAL EXPLANATION: Explain why this is the correct answer based on your Linear ticket search results. Reference specific tickets, incidents, or components found in your research."
                }},
                {{
                    "type": "drag_drop",
                    "id": "question_3",
                    "question": "REPLACE WITH ACTUAL QUESTION: Create a prioritization question specific to {query}. Focus on implementation steps, architectural decisions, or workflow priorities based on your search results.",
                    "items": [
                        {{"id": "item_1", "text": "REPLACE: First implementation step specific to {query}", "category": null}},
                        {{"id": "item_2", "text": "REPLACE: Second step based on search results", "category": null}},
                        {{"id": "item_3", "text": "REPLACE: Third step from codebase patterns", "category": null}},
                        {{"id": "item_4", "text": "REPLACE: Fourth step from team practices", "category": null}}
                    ],
                    "categories": ["REPLACE: Category 1 based on {query}", "REPLACE: Category 2 from search results", "REPLACE: Category 3 from codebase patterns"],
                    "correct_mapping": {{
                        "item_1": "REPLACE: Correct category for item 1",
                        "item_2": "REPLACE: Correct category for item 2", 
                        "item_3": "REPLACE: Correct category for item 3",
                        "item_4": "REPLACE: Correct category for item 4"
                    }},
                    "explanation": "REPLACE WITH ACTUAL EXPLANATION: Explain the correct prioritization based on your search results. Reference specific patterns, tickets, or practices found in the codebase."
                }}
            ],
            "detective_scenario": {{
                "title": "🕵️ Detective Challenge: [Engaging title related to {query}]",
                "problem_description": "Present a real issue from your search results as it would have appeared initially. Focus on symptoms, error messages, or unexpected behavior related to {query}. Make it sound like a real issue someone would investigate. 2-3 sentences max.",
                "problem_context": "Relevant background information from your searches about {query}. Include: relevant code snippets, system architecture details, related components. This should give enough context for investigation without revealing the solution. Focus on {query} concepts. 3-4 sentences max.",
                "solution": "The actual solution/resolution that was implemented. Include: what was wrong with {query}, how it was fixed, key insights about {query}. This reinforces the lesson concepts. 2-3 sentences max.",
                "hints": [
                    "Subtle hint about investigating {query} components",
                    "Hint about checking {query} configuration or logs", 
                    "Hint about common {query} issues or patterns"
                ]
            }}
        }}
        
        MANDATORY REQUIREMENTS - LESSON WILL BE REJECTED IF NOT FOLLOWED:
        - You have a MAXIMUM of 8 total informational tool calls (search_codebase + search_linear_ticket + search_slack_messages)
        - After reaching 8 informational tool calls, you MUST immediately proceed to video generation and lesson creation
        - You SHOULD use search_codebase tool 3-4 times with different queries (within the 8-call limit)
        - You SHOULD use search_linear_ticket tool 2-3 times with different queries (within the 8-call limit)
        - You MAY use search_slack_messages tool 1-2 times if helpful (within the 8-call limit)
        - ALL content must reference actual findings from your tool searches
        - Include real file paths, component names, and code snippets from search results
        - Reference specific Linear ticket IDs and discussions where relevant
        - Create 6-8 slides total following the pattern: video → code slide → video → code slide → 2-3 questions → investigation
        - Info slides (code slides): Use 3-4 bullet points (max 15 words each). Include short code snippets (max 10 lines) showing key patterns only.
        - Video slides: Focus on high-level architectural concepts, design decisions, and patterns that enable developers to start shipping code immediately
        - MCQ questions: Focus on critical architectural decisions and production priorities that developers need to understand
        - Drag-drop questions: Create topic-specific prioritization questions based on search results. Categories and items must relate directly to {query}, not generic development phases.
        - All IDs must be unique
        - Questions should test understanding of OUR specific implementation, not generic concepts
        - NO GENERIC CONTENT ALLOWED - Everything must be based on search results
        - CRITICAL: ALL PLACEHOLDER TEXT MUST BE REPLACED - Never include template text like "REPLACE WITH ACTUAL CONTENT", "Based on search results:", "[specific file]", or similar placeholders in your final response
        - DETECTIVE SCENARIO: Must be based on actual issues found in your searches - use real tickets, bugs, or problems from search results
        - If you reach the 8-call limit with insufficient results, work with what you have - do not ask for more searches
        
        VIDEO SLIDE CREATION (ARCHITECTURAL CONCEPTS):
        - Use video slides to explain high-level concepts that developers need to understand before implementing
        - When creating a video slide, use the create_educational_video tool:
          * title: Clear, descriptive title focusing on architectural concepts (keep it short)
          * narration: 1-2 sentences explaining why this concept matters for developers shipping code (will be spoken aloud)
          * bullet_points: 2-3 SHORT key points focusing on practical implications (each point max 6-8 words, comma separated)
        - The tool will generate a video and return a video_url - use this URL in your video slide
        - FOCUS ON ACTIONABLE INSIGHTS: "Error handling prevents production crashes", "Input validation blocks security issues", "Caching improves user experience"
        - Create 2 video slides per lesson focusing on the most critical concepts for developer productivity
        - Emphasize concepts that enable immediate code shipping capability
        
        CONTENT GUIDELINES:
        - Base everything on actual search results - no generic content
        - Use real code examples and file paths from search results
        - Reference specific Linear tickets and team decisions
        - Focus on how WE solve problems, not how problems are solved in general
        - Include both successes and known limitations from ticket discussions
        - Make it practical and specific to our team's work
        - DESCRIPTION: Keep to 10-15 words max, focus on learning outcomes, NO file names or technical paths
        - INFO SLIDE CONTENT FORMAT: Always use bullet points (•) with max 15 words per bullet. No paragraphs or dense text blocks.
        - CODE SNIPPETS: Keep under 10 lines, show only essential patterns, remove verbose comments and documentation
        
        SEARCH STRATEGY:
        - Search for "{query}" directly
        - Search for related technical terms and components
        - Search for common patterns like "error handling", "database", "API", etc. if relevant
        - Look for recent tickets discussing improvements or issues
        - Search for architectural decisions and technical discussions
        
        RESPOND ONLY WITH THE JSON OBJECT - NO OTHER TEXT OR FORMATTING
        """
        
        return prompt
    
    def _parse_lesson_response(self, response: str) -> dict:
        """Parse the agent response and extract JSON."""
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
            
            # Fix common JSON issues
            # Fix escaped quotes in strings that break JSON parsing
            import re
            # Replace problematic escaped quotes within text fields
            response = re.sub(r'("text":\s*)"([^"]*)\\"([^"]*)"', r'\1"\2\'\3"', response)
            response = re.sub(r'("text":\s*)"([^"]*)\\"([^"]*)\\"([^"]*)"', r'\1"\2\'\3\'\4"', response)
            
            # Parse JSON
            lesson_data = json.loads(response)
            return lesson_data
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse lesson JSON: {e}")
            print(f"Raw response (first 1000 chars): {response[:1000]}")
            print(f"Error location: line {e.lineno}, column {e.colno}")
            if e.colno > 0 and e.lineno > 0:
                lines = response.split('\n')
                if e.lineno <= len(lines):
                    error_line = lines[e.lineno - 1]
                    print(f"Error line: {error_line}")
                    print(f"Error position: {' ' * (e.colno - 1)}^")
            raise ValueError(f"Failed to parse lesson response as JSON: {str(e)}")
    
    def _create_lesson_object(self, lesson_data: dict, query: str, user_email: str) -> Lesson:
        """Create a proper Lesson object from parsed data."""
        try:
            # Generate unique lesson ID
            lesson_id = str(uuid.uuid4())
            
            # Process slides
            slides = []
            for slide_data in lesson_data.get("slides", []):
                slide_type = slide_data.get("type")
                
                if slide_type == "info":
                    slide = InfoSlide(
                        id=slide_data.get("id", f"info_{len(slides)}"),
                        title=slide_data.get("title", ""),
                        content=slide_data.get("content", ""),
                        code_snippet=slide_data.get("code_snippet"),
                        image_url=slide_data.get("image_url")
                    )
                elif slide_type == "mcq":
                    options = [
                        MCQOption(
                            id=opt.get("id", f"opt_{i}"),
                            text=opt.get("text", "")
                        )
                        for i, opt in enumerate(slide_data.get("options", []))
                    ]
                    
                    slide = MCQQuestion(
                        id=slide_data.get("id", f"mcq_{len(slides)}"),
                        question=slide_data.get("question", ""),
                        options=options,
                        correct_answer_id=slide_data.get("correct_answer_id", ""),
                        explanation=slide_data.get("explanation", "")
                    )
                elif slide_type == "drag_drop":
                    items = [
                        DragDropItem(
                            id=item.get("id", f"item_{i}"),
                            text=item.get("text", ""),
                            category=item.get("category")
                        )
                        for i, item in enumerate(slide_data.get("items", []))
                    ]
                    
                    slide = DragDropQuestion(
                        id=slide_data.get("id", f"drag_{len(slides)}"),
                        question=slide_data.get("question", ""),
                        items=items,
                        categories=slide_data.get("categories", []),
                        correct_mapping=slide_data.get("correct_mapping", {}),
                        explanation=slide_data.get("explanation", "")
                    )
                elif slide_type == "video":
                    slide = VideoSlide(
                        id=slide_data.get("id", f"video_{len(slides)}"),
                        title=slide_data.get("title", ""),
                        description=slide_data.get("description", ""),
                        video_url=slide_data.get("video_url", ""),
                        duration_seconds=slide_data.get("duration_seconds")
                    )
                elif slide_type == "interactive_investigation":
                    slide = InteractiveInvestigationSlide(
                        id=slide_data.get("id", f"detective_{len(slides)}"),
                        title=slide_data.get("title", ""),
                        problem_description=slide_data.get("problem_description", ""),
                        problem_context=slide_data.get("problem_context", ""),
                        solution=slide_data.get("solution", ""),
                        hints=slide_data.get("hints", []),
                        chat_history=slide_data.get("chat_history", []),
                        current_state=slide_data.get("current_state", "investigating"),
                        hints_given=slide_data.get("hints_given", 0)
                    )
                else:
                    continue  # Skip unknown slide types
                
                slides.append(slide)
            
            # Create lesson
            lesson = Lesson(
                id=lesson_id,
                title=lesson_data.get("title", self._generate_fallback_title(query)),
                description=lesson_data.get("description", f"Interactive lesson about {query}"),
                slides=slides,
                estimated_duration_minutes=lesson_data.get("estimated_duration_minutes", 15),
                user_email=user_email,
                created_at=datetime.utcnow()
            )
            
            return lesson
            
        except Exception as e:
            print(f"Error creating lesson object: {e}")
            raise ValueError(f"Failed to create lesson object: {str(e)}")
    
    def _generate_fallback_title(self, query: str) -> str:
        """Generate a better fallback title when AI doesn't provide one."""
        # Convert query to title case and add context
        words = query.lower().split()
        
        # Common programming terms that should be capitalized
        tech_terms = {
            'api': 'API', 'ui': 'UI', 'css': 'CSS', 'html': 'HTML', 'js': 'JavaScript',
            'sql': 'SQL', 'db': 'Database', 'auth': 'Authentication', 'jwt': 'JWT',
            'http': 'HTTP', 'rest': 'REST', 'graphql': 'GraphQL', 'json': 'JSON',
            'xml': 'XML', 'yaml': 'YAML', 'ci': 'CI', 'cd': 'CD', 'aws': 'AWS',
            'docker': 'Docker', 'k8s': 'Kubernetes', 'react': 'React', 'vue': 'Vue',
            'angular': 'Angular', 'node': 'Node.js', 'python': 'Python', 'java': 'Java'
        }
        
        # Process words
        title_words = []
        for word in words:
            if word in tech_terms:
                title_words.append(tech_terms[word])
            else:
                title_words.append(word.capitalize())
        
        # Create a descriptive title
        title = ' '.join(title_words)
        
        # Add context based on common patterns
        if any(term in query.lower() for term in ['setup', 'install', 'configure']):
            return f"{title} Setup Guide"
        elif any(term in query.lower() for term in ['debug', 'troubleshoot', 'fix', 'error']):
            return f"{title} Troubleshooting"
        elif any(term in query.lower() for term in ['test', 'testing']):
            return f"{title} Testing Strategies"
        elif any(term in query.lower() for term in ['deploy', 'deployment']):
            return f"{title} Deployment Guide"
        elif any(term in query.lower() for term in ['optimize', 'performance']):
            return f"{title} Optimization"
        else:
            return f"{title} Fundamentals"
    
    
    def _create_detective_slide_from_data(self, detective_data: Dict[str, any]) -> InteractiveInvestigationSlide:
        """Create an InteractiveInvestigationSlide from detective scenario data."""
        slide_id = f"detective_{uuid.uuid4().hex[:8]}"
        
        detective_slide = InteractiveInvestigationSlide(
            id=slide_id,
            title=detective_data["title"],
            problem_description=detective_data["problem_description"],
            problem_context=detective_data["problem_context"],
            solution=detective_data["solution"],
            hints=detective_data.get("hints", []),
            chat_history=[],
            current_state="investigating",
            hints_given=0
        )
        
        return detective_slide
    
