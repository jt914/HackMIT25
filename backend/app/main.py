from fastapi import FastAPI, HTTPException

from app.database_builder.linear_ingestion import LinearTicketIngester
from app.models import (
    RepositoryRequest,
    RepositoryResponse,
    AuthResponse,
    AccountDetails,
    LoginDetails,
    GenerateLessonRequest,
    GenerateLessonResponse,
    GetLessonsResponse,
    GetLessonResponse,
    Lesson,
    LinearTicketRequest,
    LinearTicketApiKeyRequest,
    ChatRequest,
    ChatResponse,
    SlackApiKeyRequest,
    SlackIngestionRequest,
    AddRepositoryRequest,
    RemoveRepositoryRequest,
    GetUserProfileResponse,
    UserRepository,
)
from fastapi.middleware.cors import CORSMiddleware
from app.auth import create_jwt_token
from app.api_clients.mongo import mongo_client
from app.database_builder.daytona_chunk_runner import DaytonaChunkRunner
from app.agent.agent import Agent
import json
import app.constants as constants

app = FastAPI(
    title="CodeByte API",
    description="AI-powered learning platform API for creating personalized coding lessons",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory registry of per-user agents to preserve chat context
agent_registry: dict[str, Agent] = {}


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/create-account", response_model=AuthResponse)
async def create_account(account_data: AccountDetails):
    try:
        # Check for existing email
        if mongo_client.user_exists(account_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Check for existing username
        if mongo_client.username_exists(account_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        
        if not mongo_client.create_account(account_data):
            raise HTTPException(status_code=400, detail="Failed to create account")

        token_data = create_jwt_token(account_data.email)
        return AuthResponse(**token_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/login-account", response_model=AuthResponse)
async def login_account(login_data: LoginDetails):
    try:
        if not mongo_client.verify_account(login_data):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token_data = create_jwt_token(login_data.email)
        return AuthResponse(**token_data)
    except Exception as e:
        print(f"Error logging in user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/process-repository", response_model=RepositoryResponse)
async def process_repository(request: RepositoryRequest):
    try:
        runner = DaytonaChunkRunner(constants.DAYTONA_SNAPSHOT_NAME)

        result = await runner.process_repository(str(request.github_url), request.email)

        return RepositoryResponse(
            success=result["success"],
            repository=str(request.github_url),
            sandbox_id=result.get("sandbox_id"),
            output=result.get("output", ""),
            error=result.get("error", ""),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-lesson", response_model=GenerateLessonResponse)
async def generate_lesson(request: GenerateLessonRequest):
    """
    Generate a bite-sized lesson with 10-15 slides based on user query.
    """
    try:
        # Get username for the agent
        username = mongo_client.get_username_by_email(request.email)
        if not username:
            raise HTTPException(status_code=404, detail="User not found")

        # Initialize lesson generator service
        from services.lesson_service import LessonGeneratorService
        lesson_service = LessonGeneratorService(username=username)

        # Generate lesson
        lesson = await lesson_service.generate_lesson(request.query, request.email)

        # Save lesson to MongoDB
        lesson_dict = lesson.model_dump()
        lesson_id = mongo_client.save_new_lesson(lesson_dict)

        return GenerateLessonResponse(
            success=True, 
            lesson_id=lesson_id, 
            lesson=lesson
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-linear-tickets", response_model=RepositoryResponse)
async def process_linear_tickets(request: LinearTicketRequest):
    try:
        runner = LinearTicketIngester(email=request.email)
        result = await runner.ingest_tickets()
        return RepositoryResponse(
            success=result["success"],
            repository=request.email,
            sandbox_id=result.get("sandbox_id"),
            output=result.get("output"),
            error=result.get("error"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/set-linear-api-key", response_model=RepositoryResponse)
async def set_linear_api_key(request: LinearTicketApiKeyRequest):
    try:
        mongo_client.set_linear_api_key(email=request.email, api_key=request.api_key)
        mongo_client.update_user_integrations(email=request.email, integration="linear", is_enabled=True)
        return RepositoryResponse(
            success=True,
            repository=request.email,
            sandbox_id=None,
            output=None,
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting linear api key for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/set-slack-api-key", response_model=RepositoryResponse)
async def set_slack_api_key(request: SlackApiKeyRequest):
    try:
        mongo_client.set_slack_api_key(email=request.email, api_key=request.api_key)
        mongo_client.update_user_integrations(email=request.email, integration="slack", is_enabled=True)
        return RepositoryResponse(success=True, repository=request.email, sandbox_id=None, output=None, error=None)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting slack api key for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        username = mongo_client.get_username_by_email(request.email)
        if not username:
            raise HTTPException(status_code=404, detail="User not found")

        if request.reset or request.email not in agent_registry:
            agent_registry[request.email] = Agent(username)

        agent = agent_registry[request.email]
        result = await agent.query(request.message)
        return ChatResponse(success=True, response=str(result))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/lessons/{email}", response_model=GetLessonsResponse)
async def get_user_lessons(email: str):
    """
    Get all lesson summaries for a user.
    """
    try:
        lesson_summaries = mongo_client.get_user_lesson_summaries(email)
        from app.models import LessonSummary
        
        # Convert to LessonSummary objects
        lessons = [LessonSummary(**summary) for summary in lesson_summaries]
        
        return GetLessonsResponse(success=True, lessons=lessons)
    except Exception as e:
        print(f"Error getting lessons for {email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/lesson/{email}/{lesson_id}", response_model=GetLessonResponse)
async def get_lesson_by_id(email: str, lesson_id: str):
    """
    Get a specific lesson by ID for a user.
    """
    try:
        lesson_data = mongo_client.get_lesson_by_id(email, lesson_id)
        if not lesson_data:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Convert to Lesson object
        lesson = Lesson(**lesson_data)
        
        return GetLessonResponse(success=True, lesson=lesson)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting lesson {lesson_id} for {email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-slack-messages", response_model=RepositoryResponse)
async def process_slack_messages(request: SlackIngestionRequest):
    """
    Process Slack messages from a specific channel.
    """
    try:
        from database_builder.slack_ingestion import SlackMessageIngester
        from datetime import datetime
        
        ingester = SlackMessageIngester(email=request.email)
        
        # Convert string timestamps to datetime objects if provided
        oldest = None
        latest = None
        if request.oldest:
            oldest = datetime.fromisoformat(request.oldest.replace('Z', '+00:00'))
        if request.latest:
            latest = datetime.fromisoformat(request.latest.replace('Z', '+00:00'))
        
        result = await ingester.ingest_messages(
            channel_id=request.channel_id,
            oldest=oldest,
            latest=latest,
            limit=request.limit
        )
        
        return RepositoryResponse(
            success=result["success"],
            repository=f"slack-channel-{request.channel_id}",
            sandbox_id=None,
            output=result.get("output"),
            error=result.get("error"),
        )
    except Exception as e:
        print(f"Error processing Slack messages for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user-profile/{email}", response_model=GetUserProfileResponse)
async def get_user_profile(email: str):
    """
    Get complete user profile including repositories and integrations.
    """
    try:
        profile_data = mongo_client.get_user_profile(email)
        if not profile_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert repositories to UserRepository objects
        repositories = [UserRepository(**repo) for repo in profile_data.get("repositories", [])]
        
        return GetUserProfileResponse(
            success=True,
            user=profile_data.get("user"),
            repositories=repositories,
            integrations=profile_data.get("integrations")
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user profile for {email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/add-repository", response_model=RepositoryResponse)
async def add_repository(request: AddRepositoryRequest):
    """
    Add a repository to user's repository list.
    """
    try:
        repository_data = {
            "name": request.repository_name,
            "url": request.repository_url
        }
        
        repository_id = mongo_client.add_repository(request.email, repository_data)
        
        return RepositoryResponse(
            success=True,
            repository=request.repository_url,
            sandbox_id=repository_id,
            output=f"Repository '{request.repository_name}' added successfully",
            error=None
        )
    except Exception as e:
        print(f"Error adding repository for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/remove-repository", response_model=RepositoryResponse)
async def remove_repository(request: RemoveRepositoryRequest):
    """
    Remove a repository from user's repository list.
    """
    try:
        success = mongo_client.remove_repository(request.email, request.repository_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        return RepositoryResponse(
            success=True,
            repository=request.repository_id,
            sandbox_id=None,
            output="Repository removed successfully",
            error=None
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing repository for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
