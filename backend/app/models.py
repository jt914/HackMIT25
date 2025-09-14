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
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        import re
        if not isinstance(v, str):
            raise ValueError("Username must be a string")
        
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        
        return v


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


class VideoSlide(BaseModel):
    """Video slide content."""
    
    type: str = Field(default="video", description="Slide type")
    id: str = Field(..., description="Unique slide identifier")
    title: str = Field(..., description="Video title")
    description: str = Field(..., description="Brief description of video content")
    video_url: str = Field(..., description="URL to the video (e.g., Imgur link)")
    duration_seconds: Optional[int] = Field(None, description="Video duration in seconds")


class InteractiveInvestigationSlide(BaseModel):
    """Interactive investigation slide that presents a real problem for users to solve."""
    
    type: str = Field(default="interactive_investigation", description="Slide type")
    id: str = Field(..., description="Unique slide identifier")
    title: str = Field(..., description="Investigation title")
    problem_description: str = Field(..., description="Description of the problem to investigate")
    problem_context: str = Field(..., description="Background context and relevant information")
    solution: str = Field(..., description="The actual solution (hidden from user initially)")
    hints: list[str] = Field(default_factory=list, description="Progressive hints for the investigation")
    chat_history: list[dict] = Field(default_factory=list, description="Chat conversation history")
    current_state: str = Field(default="investigating", description="Current state: investigating, solved, given_up")
    hints_given: int = Field(default=0, description="Number of hints provided so far")


class Lesson(BaseModel):
    """Complete lesson structure with 10-15 slides."""
    
    id: str = Field(..., description="Unique lesson identifier")
    title: str = Field(..., description="Lesson title")
    description: str = Field(..., description="Brief lesson description")
    slides: list[InfoSlide | VideoSlide | MCQQuestion | DragDropQuestion | InteractiveInvestigationSlide] = Field(..., min_length=10, max_length=15, description="Lesson slides")
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


class SlackIngestionRequest(BaseModel):
    """Request model for slack message ingestion."""

    email: str = Field(..., description="User email for the ingestion")
    channel_id: str = Field(..., description="Slack channel ID to ingest messages from")
    oldest: Optional[str] = Field(None, description="Oldest timestamp for messages (ISO format)")
    latest: Optional[str] = Field(None, description="Latest timestamp for messages (ISO format)")
    limit: int = Field(default=200, description="Maximum number of messages to ingest")


class UserRepository(BaseModel):
    """Model for user repository."""
    
    id: str = Field(..., description="Unique repository identifier")
    name: str = Field(..., description="Repository name")
    url: str = Field(..., description="Repository URL")
    added_at: datetime = Field(default_factory=datetime.utcnow, description="When repository was added")
    is_processed: bool = Field(default=False, description="Whether repository has been processed")


class AddRepositoryRequest(BaseModel):
    """Request model for adding a repository."""

    email: str = Field(..., description="User email")
    repository_url: str = Field(..., description="Repository URL to add")
    repository_name: str = Field(..., description="Repository name")


class RemoveRepositoryRequest(BaseModel):
    """Request model for removing a repository."""

    email: str = Field(..., description="User email")
    repository_id: str = Field(..., description="Repository ID to remove")


class GetUserProfileResponse(BaseModel):
    """Response model for user profile data."""

    success: bool
    user: Optional[dict] = None
    repositories: Optional[list[UserRepository]] = None
    integrations: Optional[dict] = None
    error: Optional[str] = None


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


class InteractiveLessonSession(BaseModel):
    """Model for interactive lesson chat session."""
    
    id: str = Field(..., description="Unique session identifier")
    user_email: str = Field(..., description="User email")
    problem_title: str = Field(..., description="Title of the problem/issue")
    problem_description: str = Field(..., description="Description of the problem being investigated")
    problem_context: str = Field(..., description="Context from codebase, Linear tickets, and Slack")
    solution: str = Field(..., description="The actual solution/answer to the problem")
    current_state: str = Field(default="investigating", description="Current state: investigating, solved, given_up")
    hints_given: int = Field(default=0, description="Number of hints provided")
    chat_history: list[dict] = Field(default_factory=list, description="Chat conversation history")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation time")
    completed_at: Optional[datetime] = Field(None, description="Session completion time")


class CreateInteractiveLessonRequest(BaseModel):
    """Request model for creating an interactive lesson session."""
    
    email: str = Field(..., description="User email")
    topic: Optional[str] = Field(None, description="Optional topic focus for finding relevant issues")


class CreateInteractiveLessonResponse(BaseModel):
    """Response model for creating an interactive lesson session."""
    
    success: bool
    session_id: Optional[str] = None
    session: Optional[InteractiveLessonSession] = None
    error: Optional[str] = None


class InteractiveLessonChatRequest(BaseModel):
    """Request model for chatting in an interactive lesson session."""
    
    email: str = Field(..., description="User email")
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="User message")


class InteractiveLessonChatResponse(BaseModel):
    """Response model for interactive lesson chat."""
    
    success: bool
    response: Optional[str] = None
    is_correct: Optional[bool] = None
    hint_provided: Optional[bool] = None
    session_completed: Optional[bool] = None
    error: Optional[str] = None


class GetInteractiveLessonSessionResponse(BaseModel):
    """Response model for getting an interactive lesson session."""
    
    success: bool
    session: Optional[InteractiveLessonSession] = None
    error: Optional[str] = None


class InteractiveSlideMessageRequest(BaseModel):
    """Request model for sending a message to an interactive investigation slide."""
    
    email: str = Field(..., description="User email")
    lesson_id: str = Field(..., description="Lesson identifier")
    slide_id: str = Field(..., description="Slide identifier")
    message: str = Field(..., description="User message")


class InteractiveSlideMessageResponse(BaseModel):
    """Response model for interactive investigation slide messages."""
    
    success: bool
    response: Optional[str] = None
    is_correct: Optional[bool] = None
    hint_provided: Optional[bool] = None
    investigation_completed: Optional[bool] = None
    updated_slide: Optional[dict] = None
    error: Optional[str] = None


# Data Source Connection State Models
class ConnectionEvent(BaseModel):
    """Model for tracking connection events."""
    
    id: str = Field(..., description="Unique event identifier")
    event_type: str = Field(..., description="Type of event: connect, disconnect, sync, error, test")
    status: str = Field(..., description="Event status: success, failure, in_progress")
    message: Optional[str] = Field(None, description="Event message or error details")
    metadata: Optional[dict] = Field(None, description="Additional event metadata")
    timestamp: datetime = Field(default_factory=datetime.now, description="Event timestamp")


class DataSourceConnectionState(BaseModel):
    """Enhanced model for tracking data source connection states."""
    
    id: str = Field(..., description="Unique connection identifier")
    user_email: str = Field(..., description="User email")
    source_type: str = Field(..., description="Type of data source: github, linear, slack, pinecone")
    source_name: str = Field(..., description="Human-readable name for the source")
    
    # Connection status
    is_connected: bool = Field(default=False, description="Whether the source is currently connected")
    connection_status: str = Field(default="disconnected", description="Current status: connected, disconnected, error, syncing")
    health_status: str = Field(default="unknown", description="Health status: healthy, degraded, unhealthy, unknown")
    
    # Configuration
    config: Optional[dict] = Field(None, description="Source-specific configuration")
    credentials_set: bool = Field(default=False, description="Whether credentials are configured")
    
    # Data sync information
    last_sync_at: Optional[datetime] = Field(None, description="Last successful sync timestamp")
    last_sync_status: Optional[str] = Field(None, description="Last sync status: success, failure, partial")
    sync_frequency: Optional[str] = Field(None, description="Sync frequency: manual, hourly, daily, weekly")
    data_count: int = Field(default=0, description="Number of items synced")
    
    # Connection tracking
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Connection creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    last_tested_at: Optional[datetime] = Field(None, description="Last connection test timestamp")
    
    # Event history (last 10 events)
    recent_events: list[ConnectionEvent] = Field(default_factory=list, description="Recent connection events")
    
    # Error tracking
    error_count: int = Field(default=0, description="Number of consecutive errors")
    last_error: Optional[str] = Field(None, description="Last error message")
    last_error_at: Optional[datetime] = Field(None, description="Last error timestamp")


class ConnectionStateRequest(BaseModel):
    """Request model for updating connection state."""
    
    email: str = Field(..., description="User email")
    source_type: str = Field(..., description="Data source type")
    source_name: Optional[str] = Field(None, description="Source name")
    status: Optional[str] = Field(None, description="Connection status")
    health_status: Optional[str] = Field(None, description="Health status")
    config: Optional[dict] = Field(None, description="Configuration updates")
    event_type: Optional[str] = Field(None, description="Event type to record")
    event_message: Optional[str] = Field(None, description="Event message")


class ConnectionStateResponse(BaseModel):
    """Response model for connection state operations."""
    
    success: bool
    connection_state: Optional[DataSourceConnectionState] = None
    error: Optional[str] = None


class GetConnectionStatesResponse(BaseModel):
    """Response model for getting all connection states."""
    
    success: bool
    connection_states: Optional[list[DataSourceConnectionState]] = None
    summary: Optional[dict] = Field(None, description="Summary statistics")
    error: Optional[str] = None


class TestConnectionRequest(BaseModel):
    """Request model for testing a connection."""
    
    email: str = Field(..., description="User email")
    source_type: str = Field(..., description="Data source type")


class TestConnectionResponse(BaseModel):
    """Response model for connection tests."""
    
    success: bool
    connection_healthy: bool = Field(default=False, description="Whether the connection is healthy")
    test_message: Optional[str] = Field(None, description="Test result message")
    response_time_ms: Optional[int] = Field(None, description="Connection response time in milliseconds")
    error: Optional[str] = None
