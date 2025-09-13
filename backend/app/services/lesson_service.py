# lesson_service.py
"""
Service for handling lesson generation using the generic CodebaseAgent.
Contains all lesson-specific logic, prompts, and formatting.
"""

from typing import Dict, Optional
from agent.agent import CodebaseAgent
import json


class LessonService:
    """Service for generating lessons using the generic codebase agent."""
    
    def __init__(self, index_name: str):
        self.agent = CodebaseAgent(index_name=index_name, temperature=0.1)
    
    async def generate_lesson(self, topic: str, user_context: Optional[Dict] = None) -> str:
        """Generate a lesson using the agent with lesson-specific prompts."""
        # Build the lesson-specific prompt
        prompt = self._build_lesson_prompt(topic, user_context)
        
        # Format output start
        self._format_lesson_generation_output(topic)
        
        try:
            # Use the generic agent to execute the lesson generation
            response = await self.agent.query(prompt)
            
            # Format output end
            self._format_lesson_generation_end()
            
            return response
            
        except Exception as e:
            print(f"❌ Error generating lesson: {str(e)}")
            self._format_lesson_generation_end()
            return f"Error generating lesson: {str(e)}"
    
    def _build_lesson_prompt(self, topic: str, user_context: Optional[Dict] = None) -> str:
        """Build a lesson-specific prompt for the agent."""
        context_info = ""
        if user_context:
            context_info = f"""
            Developer Context:
            - Role: {user_context.get("role", "developer")}
            - Experience: {user_context.get("experience", "unknown")}
            - Focus areas: {user_context.get("focus_areas", [])}
            """

        prompt = f"""
        Create an interactive Duolingo-style lesson about our implementation of: {topic}
        
        {context_info}
        
        CONTEXT: You're teaching a developer who already knows the basics of {topic}. 
        Skip generic explanations and focus ENTIRELY on how we implemented {topic} in our codebase.
        
        Your goal: Create an engaging, interactive lesson with bite-sized content slides and quizzes that can be clicked through like a slideshow.
        
        CRITICAL OUTPUT FORMAT: You MUST respond with a valid JSON object in this exact structure:
        {{
            "title": "Interactive lesson title about {topic}",
            "sections": [
                {{
                    "section_title": "Overview: Our {topic} Implementation",
                    "content": [
                        {{
                            "type": "slide",
                            "title": "Slide title here",
                            "content": "Concise, focused content about one specific aspect of our implementation. Include file references and code snippets. Keep each slide to 2-3 sentences max.",
                            "code_snippet": "Optional: relevant code from our codebase with file path",
                            "file_path": "Optional: path/to/relevant/file.py"
                        }},
                        {{
                            "type": "slide",
                            "title": "Another slide title",
                            "content": "Another focused piece of content...",
                            "code_snippet": null,
                            "file_path": null
                        }}
                    ],
                    "quiz": {{
                        "question": "Based on our implementation, which component handles [specific aspect]?",
                        "options": [
                            "Option A - specific to our code",
                            "Option B - specific to our code", 
                            "Option C - specific to our code",
                            "Option D - specific to our code"
                        ],
                        "correct_answer": 0,
                        "explanation": "Brief explanation referencing our specific implementation"
                    }}
                }},
                {{
                    "section_title": "Architecture Deep-dive",
                    "content": [
                        {{
                            "type": "slide",
                            "title": "Data Flow in Our System",
                            "content": "How data flows through our specific components...",
                            "code_snippet": "# Code from our actual files",
                            "file_path": "path/to/file.py"
                        }}
                    ],
                    "quiz": {{
                        "question": "In our architecture, what happens when [specific scenario]?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": 1,
                        "explanation": "Explanation based on our code"
                    }}
                }},
                {{
                    "section_title": "Strategic Decisions",
                    "content": [
                        {{
                            "type": "slide",
                            "title": "Why We Chose This Approach",
                            "content": "Explanation of our specific decision...",
                            "code_snippet": null,
                            "file_path": null
                        }}
                    ],
                    "quiz": {{
                        "question": "Why did we implement [specific pattern] instead of [alternative]?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": 2,
                        "explanation": "Our reasoning based on our constraints"
                    }}
                }},
                {{
                    "section_title": "Reality Check",
                    "content": [
                        {{
                            "type": "slide",
                            "title": "What Works Well",
                            "content": "Strengths of our current implementation...",
                            "code_snippet": null,
                            "file_path": null
                        }},
                        {{
                            "type": "slide", 
                            "title": "Known Limitations",
                            "content": "Technical debt and areas for improvement...",
                            "code_snippet": null,
                            "file_path": null
                        }}
                    ],
                    "quiz": {{
                        "question": "What is a current limitation in our {topic} implementation?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": 0,
                        "explanation": "Why this is a limitation in our specific context"
                    }}
                }}
            ],
            "duration_minutes": 25
        }}
                
        CRITICAL REQUIREMENTS:
        - Create 3-5 content slides per section, each focusing on ONE specific concept
        - Each slide should be concise (2-3 sentences max) and clickable
        - Include relevant code snippets and file paths from our actual codebase
        - Create MCQ quizzes that test understanding of OUR specific implementation
        - Quiz questions should be about our code, not general concepts
        - Everything must reference our actual files, components, and patterns
        - You MUST search the codebase at least 4-5 times to gather real implementation details
        - Make it interactive and engaging like Duolingo
        - RESPOND ONLY WITH THE JSON OBJECT - NO OTHER TEXT OR FORMATTING
        
        SLIDE CONTENT GUIDELINES:
        - One concept per slide
        - Include file references when relevant
        - Use code snippets to illustrate points
        - Keep text concise and scannable
        - Focus on our specific implementation choices
        
        QUIZ GUIDELINES:
        - Test knowledge of our specific implementation
        - Use real file names, component names, and patterns from our code
        - Avoid generic programming questions
        - Explanations should reference our actual codebase
        """

        return prompt

    def _format_lesson_generation_output(self, topic: str) -> None:
        """Format the start of lesson generation output."""
        print(f"\n🏗️  Generating high-level strategic lesson for: {topic}")
        print("📋 Focus: Architecture, design decisions, and big picture understanding\n")
        print("-" * 50)

    def _format_lesson_generation_end(self) -> None:
        """Format the end of lesson generation output."""
        print("-" * 50)
