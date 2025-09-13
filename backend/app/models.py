"""
Pydantic models for the Daytona Chunk Runner API.
"""

from pydantic import BaseModel, HttpUrl, Field, field_validator
from typing import Optional
from datetime import datetime


class UserInfo(BaseModel):
    email: str
    username: str


class AuthResponse(BaseModel):
    token: str
    created_at: datetime
    expires_at: datetime


class AccountDetails(BaseModel):
    email: str
    password: str
    username: str

    @field_validator("email")
    @classmethod
    def normalize_email_to_lowercase(cls, v):
        return v.lower() if isinstance(v, str) else v


class LoginDetails(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email_to_lowercase(cls, v):
        return v.lower() if isinstance(v, str) else v


class RepositoryRequest(BaseModel):
    """Request model for repository processing."""

    github_url: HttpUrl = Field(..., description="GitHub repository URL to process")
    email: str = Field(..., description="Email of the user")


class RepositoryResponse(BaseModel):
    """Response model for repository processing."""

    success: bool
    repository: str
    sandbox_id: Optional[str] = None
    output: Optional[str] = None
    error: Optional[str] = None


class QueryRequest(BaseModel):
    """Request model for querying codebase."""

    query: str = Field(..., description="Query to search for in the codebase")
    index_name: str = Field(..., description="Pinecone index name to query")


class QueryResponse(BaseModel):
    """Response model for query results."""

    success: bool
    query: str
    index_name: str
    results: Optional[str] = None
    error: Optional[str] = None


class GenerateLessonRequest(BaseModel):
    """Request model for lesson generation."""
    
    query: str = Field(..., description="What the user wants to learn")
    email: str = Field(..., description="User email for saving the lesson")


class MCQOption(BaseModel):
    """Multiple choice question option."""
    
    id: str = Field(..., description="Unique identifier for the option")
    text: str = Field(..., description="Option text")


class MCQQuestion(BaseModel):
    """Multiple choice question."""
    
    type: str = Field(default="mcq", description="Question type")
    id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="Question text")
    options: list[MCQOption] = Field(..., min_length=2, max_length=6, description="Answer options")
    correct_answer_id: str = Field(..., description="ID of the correct option")
    explanation: str = Field(..., description="Explanation of the correct answer")


class DragDropItem(BaseModel):
    """Drag and drop item."""
    
    id: str = Field(..., description="Unique identifier for the item")
    text: str = Field(..., description="Item text")
    category: Optional[str] = Field(None, description="Category this item belongs to")


class DragDropQuestion(BaseModel):
    """Drag and drop question."""
    
    type: str = Field(default="drag_drop", description="Question type")
    id: str = Field(..., description="Unique question identifier")
    question: str = Field(..., description="Question text")
    items: list[DragDropItem] = Field(..., description="Items to be dragged")
    categories: list[str] = Field(..., description="Drop categories")
    correct_mapping: dict[str, str] = Field(..., description="Mapping of item_id to category")
    explanation: str = Field(..., description="Explanation of the correct answer")


class InfoSlide(BaseModel):
    """Information slide content."""
    
    type: str = Field(default="info", description="Slide type")
    id: str = Field(..., description="Unique slide identifier")
    title: str = Field(..., description="Slide title")
    content: str = Field(..., description="Slide content")
    code_snippet: Optional[str] = Field(None, description="Optional code snippet")
    image_url: Optional[str] = Field(None, description="Optional image URL")


class Lesson(BaseModel):
    """Complete lesson structure with 10-15 slides."""
    
    id: str = Field(..., description="Unique lesson identifier")
    title: str = Field(..., description="Lesson title")
    description: str = Field(..., description="Brief lesson description")
    slides: list[InfoSlide | MCQQuestion | DragDropQuestion] = Field(..., min_length=10, max_length=15, description="Lesson slides")
    estimated_duration_minutes: int = Field(default=15, description="Estimated completion time")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    user_email: str = Field(..., description="Email of the user who requested the lesson")


class LessonSummary(BaseModel):
    """Summary of a lesson for listing purposes."""
    
    id: str = Field(..., description="Unique lesson identifier")
    title: str = Field(..., description="Lesson title")
    description: str = Field(..., description="Brief lesson description")
    estimated_duration_minutes: int = Field(..., description="Estimated completion time")
    created_at: datetime = Field(..., description="Creation timestamp")


class GenerateLessonResponse(BaseModel):
    """Response model for lesson generation."""
    
    success: bool
    lesson_id: Optional[str] = None
    lesson: Optional[Lesson] = None
    error: Optional[str] = None


class GetLessonsResponse(BaseModel):
    """Response model for getting user lessons."""
    
    success: bool
    lessons: Optional[list[LessonSummary]] = None
    error: Optional[str] = None


class GetLessonResponse(BaseModel):
    """Response model for getting a specific lesson."""
    
    success: bool
    lesson: Optional[Lesson] = None
    error: Optional[str] = None


class LinearTicketApiKeyRequest(BaseModel):
    """Request model for linear ticket api key processing."""

    email: str = Field(..., description="User email for saving the lesson")
    api_key: str = Field(..., description="Linear api key for the user")


class LinearTicketRequest(BaseModel):
    """Request model for linear ticket processing."""

    email: str = Field(..., description="User email for saving the lesson")


class SlackApiKeyRequest(BaseModel):
    """Request model for slack api key processing."""

    email: str = Field(..., description="User email for saving the lesson")
    api_key: str = Field(..., description="Slack api key for the user")


class ChatRequest(BaseModel):
    """Request model for chatting with the agent."""

    email: str = Field(..., description="User email for the session")
    message: str = Field(..., description="User message to the agent")
    reset: bool = Field(default=False, description="Start a new chat session")


class ChatResponse(BaseModel):
    """Response model for chat messages."""

    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
