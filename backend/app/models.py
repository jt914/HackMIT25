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


class LessonRequest(BaseModel):
    """Request model for lesson creation."""

    topic: str = Field(..., description="Topic for the lesson")
    role: str = Field(description="User's role")
    experience: str = Field(description="Years of experience")
    focus_areas: list[str] = Field(description="Areas of focus")
    email: str = Field(..., description="User email for saving the lesson")


class Slide(BaseModel):
    """Individual slide content."""

    type: str = Field(default="slide")
    title: str
    content: str
    code_snippet: Optional[str] = None
    file_path: Optional[str] = None


class Quiz(BaseModel):
    """Quiz for testing understanding."""

    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: int = Field(ge=0, le=3)
    explanation: str


class LessonSection(BaseModel):
    """A section of the lesson with slides and a quiz."""

    section_title: str
    content: list[Slide]
    quiz: Quiz


class LessonContent(BaseModel):
    """Structure for interactive lesson content."""

    title: str
    sections: list[LessonSection]
    duration_minutes: int = Field(default=25)


class LessonResponse(BaseModel):
    """Response model for lesson creation."""

    success: bool
    lesson_id: Optional[str] = None
    lesson: Optional[LessonContent] = None
    error: Optional[str] = None


class LinearTicketApiKeyRequest(BaseModel):
    """Request model for linear ticket api key processing."""

    email: str = Field(..., description="User email for saving the lesson")
    api_key: str = Field(..., description="Linear api key for the user")


class LinearTicketRequest(BaseModel):
    """Request model for linear ticket processing."""

    email: str = Field(..., description="User email for saving the lesson")


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
