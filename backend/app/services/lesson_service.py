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
        print("📚 Creating 10-15 interactive slides with questions...")
        
        try:
            # Use the agent to generate lesson content
            response = await self.agent.query(prompt)
            
            # Parse the JSON response
            lesson_data = self._parse_lesson_response(response)
            
            # Create lesson object with proper structure
            lesson = self._create_lesson_object(lesson_data, query, user_email)
            
            # Add interactive detective scenario at the end
            detective_slide = await self._generate_detective_scenario(query, user_email)
            if detective_slide:
                lesson.slides.append(detective_slide)
                print("🕵️ Added interactive detective scenario to lesson")
            
            print("✅ Lesson generated successfully!")
            return lesson
            
        except Exception as e:
            print(f"❌ Error generating lesson: {str(e)}")
            raise e
    
    def _build_lesson_prompt(self, query: str) -> str:
        """Build a prompt for generating bite-sized lessons based on actual codebase and Linear issues."""
        
        prompt = f"""
        STOP! READ THIS CAREFULLY BEFORE PROCEEDING:
        
        You are about to create a lesson about: "{query}"
        
        MANDATORY TOOL USAGE - YOU CANNOT PROCEED WITHOUT THESE STEPS:
        
        STEP 1: SEARCH CODEBASE (REQUIRED - MINIMUM 3 SEARCHES)
        You MUST use the search_codebase tool AT LEAST 3 times with different search terms:
        - Search 1: "{query}" (exact topic)
        - Search 2: Related technical terms (e.g., if query is "authentication", search "auth", "login", "jwt", etc.)
        - Search 3: Architectural components (e.g., "service", "controller", "model", etc.)
        
        STEP 2: SEARCH LINEAR TICKETS (REQUIRED - MINIMUM 2 SEARCHES) 
        You MUST use the search_linear_ticket tool AT LEAST 2 times:
        - Search 1: "{query}" (exact topic)
        - Search 2: Related issues (e.g., "bug", "feature", "improvement" related to the topic)
        
        STEP 3: VERIFY TOOL USAGE
        Before generating the lesson, confirm you have:
        ✅ Made at least 3 codebase searches
        ✅ Made at least 2 Linear ticket searches  
        ✅ Found actual code files and components
        ✅ Found actual Linear tickets or issues
        
        IF YOU HAVE NOT COMPLETED ALL TOOL SEARCHES, DO NOT PROCEED WITH LESSON GENERATION.
        
        STEP 4: ANALYZE YOUR FINDINGS
        After completing all searches, synthesize the results to understand:
        - How we actually implement "{query}" in our codebase
        - What challenges and decisions the team has faced (from Linear tickets)
        - Real code examples and architectural patterns we use
        - Common issues, bugs, or improvements discussed in tickets
        
        LESSON STRUCTURE:
        - Total slides: 10-15 slides
        - Pattern: 1-2 info slides → 2-3 questions → repeat (optionally include 1 video slide)
        - Slide types: Info slides, Video slides, Multiple choice (MCQ), and drag-and-drop
        - Each info slide should be concise and focused on one concept
        - Video slides should summarize 3-5 key points with narration
        - ALL CONTENT MUST BE BASED ON YOUR TOOL SEARCH RESULTS
        
        CRITICAL OUTPUT FORMAT: You MUST respond with a valid JSON object in this exact structure:
        {{
            "title": "Generate a concise, descriptive title (5-8 words) that summarizes what the user will learn about {query}. Focus on the key concepts, not implementation details. Examples: 'Authentication Flow Fundamentals', 'Database Query Optimization Techniques', 'API Design Best Practices'",
            "description": "Interactive lesson covering {query} concepts and implementation patterns (10-15 words max, no file names)",
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
                    "type": "video",
                    "id": "video_1",
                    "title": "Key {query} Concepts",
                    "description": "Overview of how we implement {query} in our system",
                    "video_url": "GENERATED_BY_TOOL",
                    "duration_seconds": null
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
        
        MANDATORY REQUIREMENTS - LESSON WILL BE REJECTED IF NOT FOLLOWED:
        - You MUST use search_codebase tool AT LEAST 3 times with different queries
        - You MUST use search_linear_ticket tool AT LEAST 2 times with different queries  
        - ALL content must reference actual findings from your tool searches
        - Include real file paths, component names, and code snippets from search results
        - Reference specific Linear ticket IDs and discussions where relevant
        - Create 10-15 slides total with mix of info slides, questions, and optionally 1 video slide
        - Info slides: 2-3 sentences max, focus on one concept from our actual implementation
        - Video slides: Create when you want to summarize 3-5 key points with visual narration
        - MCQ questions: Use real component/file names from our codebase as options
        - Drag-drop questions: Use actual architectural elements from search results
        - All IDs must be unique
        - Questions should test understanding of OUR specific implementation, not generic concepts
        - NO GENERIC CONTENT ALLOWED - Everything must be based on search results
        - If search results are empty or insufficient, explain what you searched for and ask for different search terms
        
        VIDEO SLIDE CREATION (OPTIONAL):
        - Use video slides to summarize key concepts with visual bullet points and narration
        - When creating a video slide, use the create_educational_video tool:
          * title: Clear, descriptive title for the video
          * narration: 2-3 sentences explaining the concepts (will be spoken aloud)
          * bullet_points: 3-5 key points from your search results (comma separated)
        - The tool will generate a video and return a video_url - use this URL in your video slide
        - Video slides work well for: architecture overviews, key concepts, process flows
        - Limit to 1 video slide per lesson to maintain engagement balance
        
        CONTENT GUIDELINES:
        - Base everything on actual search results - no generic content
        - Use real code examples and file paths from search results
        - Reference specific Linear tickets and team decisions
        - Focus on how WE solve problems, not how problems are solved in general
        - Include both successes and known limitations from ticket discussions
        - Make it practical and specific to our team's work
        - DESCRIPTION: Keep to 10-15 words max, focus on learning outcomes, NO file names or technical paths
        
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
    
    async def _generate_detective_scenario(self, query: str, user_email: str) -> Optional[InteractiveInvestigationSlide]:
        """Generate an interactive detective scenario related to the lesson topic."""
        try:
            print(f"🕵️ Generating detective scenario for topic: {query}")
            
            # Use the interactive lesson service to generate a problem related to the lesson topic
            problem_prompt = f"""
            MISSION: Create an interactive detective scenario for a lesson about "{query}".
            
            MANDATORY SEARCH STEPS - YOU MUST DO ALL OF THESE:
            
            STEP 1: SEARCH LINEAR TICKETS (REQUIRED - MINIMUM 3 SEARCHES)
            Search for issues related to "{query}":
            - Search 1: "{query}" (exact topic)
            - Search 2: Related technical terms and components
            - Search 3: "bug" OR "error" OR "issue" related to this topic
            
            STEP 2: SEARCH CODEBASE (REQUIRED - MINIMUM 2 SEARCHES) 
            Look for code related to the lesson topic:
            - Search 1: "{query}"
            - Search 2: Components, functions, or files mentioned in Linear tickets
            
            STEP 3: SEARCH SLACK MESSAGES (OPTIONAL - 1 SEARCH)
            Look for team discussions about "{query}" issues:
            - Search 1: "{query}" OR "problem" OR "issue" OR "bug"
            
            ANALYSIS CRITERIA:
            Find an issue that is:
            ✅ Directly related to "{query}" (the lesson topic)
            ✅ Technical and educational
            ✅ Has clear problem description and resolution
            ✅ Would reinforce the lesson concepts through investigation
            ✅ Not too simple (requires some investigation)
            ✅ Not too complex (solvable with lesson knowledge)
            
            DETECTIVE SCENARIO REQUIREMENTS:
            - Present it as a real problem that happened in our system
            - Make it feel like a mystery to be solved
            - Connect it to the concepts taught in the "{query}" lesson
            - Include enough context for investigation but don't reveal the solution
            - Make it engaging and educational
            
            REQUIRED OUTPUT FORMAT - Respond with JSON only:
            {{
                "title": "🕵️ Detective Challenge: [Engaging title related to {query}]",
                "problem_description": "Present the problem as it would have appeared initially. Focus on symptoms, error messages, or unexpected behavior related to {query}. Make it sound like a real issue someone would investigate. 2-3 sentences max.",
                "problem_context": "Relevant background information from your searches about {query}. Include: relevant code snippets, system architecture details, related components. This should give enough context for investigation without revealing the solution. Focus on {query} concepts. 3-4 sentences max.",
                "solution": "The actual solution/resolution that was implemented. Include: what was wrong with {query}, how it was fixed, key insights about {query}. This reinforces the lesson concepts. 2-3 sentences max.",
                "hints": [
                    "Subtle hint about investigating {query} components",
                    "Hint about checking {query} configuration or logs", 
                    "Hint about common {query} issues or patterns"
                ]
            }}
            
            IMPORTANT: The scenario should reinforce and apply the concepts from the "{query}" lesson, making it a practical detective exercise.
            """
            
            response = await self.agent.query(problem_prompt)
            
            # Parse the response to extract problem data
            problem_data = self._parse_detective_response(response)
            
            # Create the interactive investigation slide
            slide_id = f"detective_{uuid.uuid4().hex[:8]}"
            
            detective_slide = InteractiveInvestigationSlide(
                id=slide_id,
                title=problem_data["title"],
                problem_description=problem_data["problem_description"],
                problem_context=problem_data["problem_context"],
                solution=problem_data["solution"],
                hints=problem_data.get("hints", []),
                chat_history=[],
                current_state="investigating",
                hints_given=0
            )
            
            return detective_slide
            
        except Exception as e:
            print(f"❌ Error generating detective scenario: {str(e)}")
            # Return None if we can't generate a detective scenario - lesson can still proceed
            return None
    
    def _parse_detective_response(self, response: str) -> Dict[str, any]:
        """Parse the agent response for detective scenario generation."""
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
            required_fields = ["title", "problem_description", "problem_context", "solution"]
            for field in required_fields:
                if field not in problem_data:
                    raise ValueError(f"Missing required field: {field}")
            
            return problem_data
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse detective JSON: {e}")
            print(f"Raw response (first 500 chars): {response[:500]}")
            raise ValueError(f"Failed to parse detective response as JSON: {str(e)}")
