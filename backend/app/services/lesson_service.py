# lesson_service.py
"""
Service for generating bite-sized lessons with MCQ and drag-drop questions.
"""

from typing import Dict, Optional
from agent.agent import Agent
from models import Lesson, InfoSlide, MCQQuestion, MCQOption, DragDropQuestion, DragDropItem
import json
import uuid
from datetime import datetime


class LessonGeneratorService:
    """Service for generating bite-sized interactive lessons."""
    
    def __init__(self, username: str):
        self.agent = Agent(username=username, temperature=0.3)
    
    async def generate_lesson(self, query: str, user_email: str) -> Lesson:
        """Generate a bite-sized lesson based on user query."""
        # Build the lesson generation prompt
        prompt = self._build_lesson_prompt(query)
        
        print(f"\n🎓 Generating bite-sized lesson for: {query}")
        print("📚 Creating 10-15 interactive slides with questions...")
        
        try:
            # Use the agent to generate lesson content
            response = await self.agent.query(prompt)
            
            # Parse the JSON response
            lesson_data = self._parse_lesson_response(response)
            
            # Create lesson object with proper structure
            lesson = self._create_lesson_object(lesson_data, query, user_email)
            
            print("✅ Lesson generated successfully!")
            return lesson
            
        except Exception as e:
            print(f"❌ Error generating lesson: {str(e)}")
            raise e
    
    def _build_lesson_prompt(self, query: str) -> str:
        """Build a prompt for generating bite-sized lessons based on actual codebase and Linear issues."""
        
        prompt = f"""
        Create a bite-sized interactive lesson about: "{query}"
        
        CRITICAL FIRST STEP: You MUST use the available tools to research our actual codebase and Linear issues BEFORE creating the lesson:
        
        1. SEARCH CODEBASE: Use search_codebase tool to find relevant code implementations related to "{query}"
           - Search for architectural patterns, components, services, and implementations
           - Look for specific files, classes, and functions related to the topic
           - Search multiple times with different keywords to get comprehensive coverage
        
        2. SEARCH LINEAR TICKETS: Use search_linear_ticket tool to find relevant issues, bugs, and feature requests
           - Search for tickets discussing "{query}" or related concepts
           - Look for implementation decisions, technical discussions, and known issues
           - Find patterns in how the team approaches problems related to this topic
        
        3. ANALYZE FINDINGS: Synthesize the search results to understand:
           - How we actually implement "{query}" in our codebase
           - What challenges and decisions the team has faced (from Linear tickets)
           - Real code examples and architectural patterns we use
           - Common issues, bugs, or improvements discussed in tickets
        
        LESSON STRUCTURE:
        - Total slides: 10-15 slides
        - Pattern: 1-2 info slides → 2-3 questions → repeat
        - Question types: Multiple choice (MCQ) and drag-and-drop
        - Each info slide should be concise and focused on one concept
        - ALL CONTENT MUST BE BASED ON YOUR TOOL SEARCH RESULTS
        
        CRITICAL OUTPUT FORMAT: You MUST respond with a valid JSON object in this exact structure:
        {{
            "title": "How We Implement {query} - Interactive Lesson",
            "description": "Learn about our specific implementation of {query} based on our actual codebase and team discussions",
            "slides": [
                {{
                    "type": "info",
                    "id": "slide_1",
                    "title": "Our {query} Architecture",
                    "content": "Based on [specific file/component found in search]: Brief explanation of how we implement this. Reference actual code structure.",
                    "code_snippet": "// Actual code snippet from search results\nfunction ourImplementation() {{\n  // Real code from our codebase\n}}",
                    "image_url": null
                }},
                {{
                    "type": "info", 
                    "id": "slide_2",
                    "title": "Key Components We Use",
                    "content": "Our system uses [specific components from search]. These handle [specific functionality found in code].",
                    "code_snippet": "// Real code showing component usage",
                    "image_url": null
                }},
                {{
                    "type": "mcq",
                    "id": "question_1",
                    "question": "In our codebase, which component handles [specific functionality you found]?",
                    "options": [
                        {{"id": "opt_1", "text": "Real component name from our code"}},
                        {{"id": "opt_2", "text": "Another real component name"}},
                        {{"id": "opt_3", "text": "Third real component name"}},
                        {{"id": "opt_4", "text": "Fourth real component name"}}
                    ],
                    "correct_answer_id": "opt_1",
                    "explanation": "Based on our search results, [component] handles this in [specific file path]"
                }},
                {{
                    "type": "info",
                    "id": "slide_3", 
                    "title": "Team Decisions & Challenges",
                    "content": "From Linear ticket [ticket ID]: Our team decided to [specific decision]. This was because [reason from ticket discussion].",
                    "code_snippet": null,
                    "image_url": null
                }},
                {{
                    "type": "drag_drop",
                    "id": "question_2", 
                    "question": "Match our actual components to their functions (based on codebase search):",
                    "items": [
                        {{"id": "item_1", "text": "Real component A from our code", "category": null}},
                        {{"id": "item_2", "text": "Real component B from our code", "category": null}},
                        {{"id": "item_3", "text": "Actual function X from our code", "category": null}},
                        {{"id": "item_4", "text": "Actual function Y from our code", "category": null}}
                    ],
                    "categories": ["Components", "Functions"],
                    "correct_mapping": {{
                        "item_1": "Components",
                        "item_2": "Components", 
                        "item_3": "Functions",
                        "item_4": "Functions"
                    }},
                    "explanation": "Based on our codebase analysis, these components handle [specific responsibilities]"
                }}
            ]
        }}
        
        MANDATORY REQUIREMENTS:
        - You MUST use search_codebase and search_linear_ticket tools BEFORE generating content
        - ALL content must reference actual findings from your tool searches
        - Include real file paths, component names, and code snippets from search results
        - Reference specific Linear ticket IDs and discussions where relevant
        - Create 10-15 slides total with mix of info slides and questions
        - Info slides: 2-3 sentences max, focus on one concept from our actual implementation
        - MCQ questions: Use real component/file names from our codebase as options
        - Drag-drop questions: Use actual architectural elements from search results
        - All IDs must be unique
        - Questions should test understanding of OUR specific implementation, not generic concepts
        
        CONTENT GUIDELINES:
        - Base everything on actual search results - no generic content
        - Use real code examples and file paths from search results
        - Reference specific Linear tickets and team decisions
        - Focus on how WE solve problems, not how problems are solved in general
        - Include both successes and known limitations from ticket discussions
        - Make it practical and specific to our team's work
        
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
            
            # Parse JSON
            lesson_data = json.loads(response)
            return lesson_data
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse lesson JSON: {e}")
            print(f"Raw response: {response}")
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
                else:
                    continue  # Skip unknown slide types
                
                slides.append(slide)
            
            # Create lesson
            lesson = Lesson(
                id=lesson_id,
                title=lesson_data.get("title", f"Lesson: {query}"),
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
