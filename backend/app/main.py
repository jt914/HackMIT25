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
    InteractiveSlideMessageRequest,
    InteractiveSlideMessageResponse,
    # Connection State Management Models
    DataSourceConnectionState,
    ConnectionStateRequest,
    ConnectionStateResponse,
    GetConnectionStatesResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from fastapi.middleware.cors import CORSMiddleware
from app.auth import create_jwt_token
from app.api_clients.mongo import mongo_client
from app.database_builder.daytona_chunk_runner import DaytonaChunkRunner
from app.agent.agent import Agent
import json
import app.constants as constants
from datetime import datetime

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

        # Initialize default connection states for new user
        mongo_client.initialize_default_connection_states(account_data.email)

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
        # Add sync start event for GitHub repository processing
        event_data = {
            "event_type": "sync",
            "status": "in_progress",
            "message": f"Starting repository processing for {request.github_url}"
        }
        mongo_client.add_connection_event(request.email, "github", event_data)
        
        runner = DaytonaChunkRunner(constants.DAYTONA_SNAPSHOT_NAME)
        result = await runner.process_repository(str(request.github_url), request.email)

        # Update sync info and add completion event
        if result["success"]:
            sync_data = {
                "last_sync_status": "success",
                "data_count": result.get("chunk_count", 0)
            }
            mongo_client.update_connection_sync_info(request.email, "github", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "success",
                "message": f"Successfully processed repository {request.github_url}"
            }
            mongo_client.add_connection_event(request.email, "github", event_data)
        else:
            sync_data = {
                "last_sync_status": "failure"
            }
            mongo_client.update_connection_sync_info(request.email, "github", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "failure",
                "message": f"Repository processing failed: {result.get('error', 'Unknown error')}"
            }
            mongo_client.add_connection_event(request.email, "github", event_data)

        return RepositoryResponse(
            success=result["success"],
            repository=str(request.github_url),
            sandbox_id=result.get("sandbox_id"),
            output=result.get("output", ""),
            error=result.get("error", ""),
        )

    except Exception as e:
        # Add error event
        event_data = {
            "event_type": "sync",
            "status": "failure",
            "message": f"Repository processing error: {str(e)}"
        }
        mongo_client.add_connection_event(request.email, "github", event_data)
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
        from app.services.lesson_service import LessonGeneratorService
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
        # Add sync start event
        event_data = {
            "event_type": "sync",
            "status": "in_progress",
            "message": "Starting Linear tickets sync"
        }
        mongo_client.add_connection_event(request.email, "linear", event_data)
        
        runner = LinearTicketIngester(email=request.email)
        result = await runner.ingest_tickets()
        
        # Update sync info and add completion event
        if result["success"]:
            sync_data = {
                "last_sync_status": "success",
                "data_count": result.get("ticket_count", 0)
            }
            mongo_client.update_connection_sync_info(request.email, "linear", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "success",
                "message": f"Successfully synced {result.get('ticket_count', 0)} Linear tickets"
            }
            mongo_client.add_connection_event(request.email, "linear", event_data)
        else:
            sync_data = {
                "last_sync_status": "failure"
            }
            mongo_client.update_connection_sync_info(request.email, "linear", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "failure",
                "message": f"Linear sync failed: {result.get('error', 'Unknown error')}"
            }
            mongo_client.add_connection_event(request.email, "linear", event_data)
        
        return RepositoryResponse(
            success=result["success"],
            repository=request.email,
            sandbox_id=result.get("sandbox_id"),
            output=result.get("output"),
            error=result.get("error"),
        )
    except Exception as e:
        # Add error event
        event_data = {
            "event_type": "sync",
            "status": "failure",
            "message": f"Linear sync error: {str(e)}"
        }
        mongo_client.add_connection_event(request.email, "linear", event_data)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/set-linear-api-key", response_model=RepositoryResponse)
async def set_linear_api_key(request: LinearTicketApiKeyRequest):
    try:
        mongo_client.set_linear_api_key(email=request.email, api_key=request.api_key)
        mongo_client.update_user_integrations(email=request.email, integration="linear", is_enabled=True)
        
        # Update connection state
        connection_data = {
            "user_email": request.email,
            "source_type": "linear",
            "source_name": "Linear Issues",
            "credentials_set": True,
            "is_connected": True,
            "connection_status": "connected"
        }
        mongo_client.create_or_update_connection_state(connection_data)
        
        # Add connection event
        event_data = {
            "event_type": "connect",
            "status": "success",
            "message": "Linear API key configured successfully"
        }
        mongo_client.add_connection_event(request.email, "linear", event_data)
        
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
        
        # Update connection state
        connection_data = {
            "user_email": request.email,
            "source_type": "slack",
            "source_name": "Slack Messages",
            "credentials_set": True,
            "is_connected": True,
            "connection_status": "connected"
        }
        mongo_client.create_or_update_connection_state(connection_data)
        
        # Add connection event
        event_data = {
            "event_type": "connect",
            "status": "success",
            "message": "Slack API key configured successfully"
        }
        mongo_client.add_connection_event(request.email, "slack", event_data)
        
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


@app.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str):
    """
    Delete a lesson by ID.
    """
    try:
        success = mongo_client.delete_lesson(lesson_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        return {"message": "Lesson deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting lesson {lesson_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-slack-messages", response_model=RepositoryResponse)
async def process_slack_messages(request: SlackIngestionRequest):
    """
    Process Slack messages from a specific channel.
    """
    try:
        from app.database_builder.slack_ingestion import SlackMessageIngester
        from datetime import datetime
        
        # Add sync start event
        event_data = {
            "event_type": "sync",
            "status": "in_progress",
            "message": f"Starting Slack messages sync for channel {request.channel_id}"
        }
        mongo_client.add_connection_event(request.email, "slack", event_data)
        
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
        
        # Update sync info and add completion event
        if result["success"]:
            sync_data = {
                "last_sync_status": "success",
                "data_count": result.get("message_count", 0)
            }
            mongo_client.update_connection_sync_info(request.email, "slack", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "success",
                "message": f"Successfully synced {result.get('message_count', 0)} Slack messages from channel {request.channel_id}"
            }
            mongo_client.add_connection_event(request.email, "slack", event_data)
        else:
            sync_data = {
                "last_sync_status": "failure"
            }
            mongo_client.update_connection_sync_info(request.email, "slack", sync_data)
            
            event_data = {
                "event_type": "sync",
                "status": "failure",
                "message": f"Slack sync failed: {result.get('error', 'Unknown error')}"
            }
            mongo_client.add_connection_event(request.email, "slack", event_data)
        
        return RepositoryResponse(
            success=result["success"],
            repository=f"slack-channel-{request.channel_id}",
            sandbox_id=None,
            output=result.get("output"),
            error=result.get("error"),
        )
    except Exception as e:
        # Add error event
        event_data = {
            "event_type": "sync",
            "status": "failure",
            "message": f"Slack sync error: {str(e)}"
        }
        mongo_client.add_connection_event(request.email, "slack", event_data)
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


@app.post("/interactive-slide-message", response_model=InteractiveSlideMessageResponse)
async def interactive_slide_message(request: InteractiveSlideMessageRequest):
    """
    Handle a message sent to an interactive investigation slide within a lesson.
    """
    try:
        # Get username for the service
        username = mongo_client.get_username_by_email(request.email)
        if not username:
            raise HTTPException(status_code=404, detail="User not found")

        # Get the lesson
        lesson_data = mongo_client.get_lesson_by_id(request.email, request.lesson_id)
        if not lesson_data:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # Find the interactive investigation slide
        slide_data = None
        slide_index = None
        for i, slide in enumerate(lesson_data.get("slides", [])):
            if slide.get("id") == request.slide_id and slide.get("type") == "interactive_investigation":
                slide_data = slide
                slide_index = i
                break

        if not slide_data:
            raise HTTPException(status_code=404, detail="Interactive investigation slide not found")

        # Initialize interactive lesson service for handling the chat
        from app.services.interactive_lesson_service import InteractiveLessonService
        lesson_service = InteractiveLessonService(username=username)

        # Handle the message using the service
        response, is_correct, hint_provided, investigation_completed = await lesson_service.handle_slide_message(
            slide_data, request.message
        )

        # Update the slide data with new chat history and state
        slide_data["chat_history"].append({
            "role": "user",
            "message": request.message,
            "timestamp": datetime.utcnow().isoformat()
        })

        slide_data["chat_history"].append({
            "role": "assistant",
            "message": response,
            "timestamp": datetime.utcnow().isoformat(),
            "is_correct": is_correct,
            "hint_provided": hint_provided
        })

        if hint_provided:
            slide_data["hints_given"] = slide_data.get("hints_given", 0) + 1

        if investigation_completed:
            slide_data["current_state"] = "solved" if is_correct else "given_up"


        # Update the lesson in the database
        lesson_data["slides"][slide_index] = slide_data
        mongo_client.update_lesson_slide(request.email, request.lesson_id, slide_index, slide_data)

        return InteractiveSlideMessageResponse(
            success=True,
            response=response,
            is_correct=is_correct,
            hint_provided=hint_provided,
            investigation_completed=investigation_completed,
            updated_slide=slide_data
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error handling interactive slide message for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Connection State Management Endpoints

@app.get("/connection-states/{email}", response_model=GetConnectionStatesResponse)
async def get_connection_states(email: str):
    """
    Get all connection states for a user with summary statistics.
    """
    try:
        connection_states_data = mongo_client.get_connection_states(email)
        summary = mongo_client.get_connection_state_summary(email)
        
        # Convert to DataSourceConnectionState objects
        connection_states = [DataSourceConnectionState(**state) for state in connection_states_data]
        
        return GetConnectionStatesResponse(
            success=True,
            connection_states=connection_states,
            summary=summary
        )
    except Exception as e:
        print(f"Error getting connection states for {email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/connection-state", response_model=ConnectionStateResponse)
async def update_connection_state(request: ConnectionStateRequest):
    """
    Update or create a connection state.
    """
    try:
        connection_data = {
            "user_email": request.email,
            "source_type": request.source_type
        }
        
        if request.source_name:
            connection_data["source_name"] = request.source_name
        if request.status:
            connection_data["connection_status"] = request.status
        if request.health_status:
            connection_data["health_status"] = request.health_status
        if request.config:
            connection_data["config"] = request.config
        
        connection_id = mongo_client.create_or_update_connection_state(connection_data)
        
        # Add event if specified
        if request.event_type:
            event_data = {
                "event_type": request.event_type,
                "status": "success",
                "message": request.event_message or f"{request.event_type.title()} event"
            }
            mongo_client.add_connection_event(request.email, request.source_type, event_data)
        
        # Get updated connection state
        updated_states = mongo_client.get_connection_states(request.email)
        updated_state = next((s for s in updated_states if s["id"] == connection_id), None)
        
        if updated_state:
            connection_state = DataSourceConnectionState(**updated_state)
            return ConnectionStateResponse(success=True, connection_state=connection_state)
        else:
            raise HTTPException(status_code=404, detail="Connection state not found after update")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating connection state for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """
    Test a connection to verify it's working properly.
    """
    try:
        import time
        start_time = time.time()
        
        connection_healthy = False
        test_message = ""
        
        if request.source_type == "linear":
            # Test Linear connection
            try:
                from app.api_clients.linear_client import LinearClient
                api_key = mongo_client.get_linear_api_key(request.email)
                if not api_key:
                    test_message = "Linear API key not configured"
                else:
                    client = LinearClient(api_key)
                    team_ids = await client.get_team_ids()
                    if team_ids:
                        connection_healthy = True
                        test_message = f"Successfully connected to {len(team_ids)} team(s)"
                    else:
                        test_message = "No teams found - check API key permissions"
            except Exception as e:
                test_message = f"Linear connection failed: {str(e)}"
                
        elif request.source_type == "slack":
            # Test Slack connection
            try:
                from app.api_clients.slack_client import SlackClient
                api_key = mongo_client.get_slack_api_key(request.email)
                if not api_key:
                    test_message = "Slack API key not configured"
                else:
                    client = SlackClient(api_key)
                    # Try to get bot info as a simple test
                    auth_response = await client.test_auth()
                    if auth_response.get("ok"):
                        connection_healthy = True
                        test_message = "Successfully connected to Slack"
                    else:
                        test_message = f"Slack auth failed: {auth_response.get('error', 'Unknown error')}"
            except Exception as e:
                test_message = f"Slack connection failed: {str(e)}"
                
        elif request.source_type == "github":
            # Test GitHub connection (repository processing)
            try:
                repositories = mongo_client.get_user_repositories(request.email)
                if repositories:
                    connection_healthy = True
                    processed_count = len([r for r in repositories if r.get("is_processed", False)])
                    test_message = f"Found {len(repositories)} repositories, {processed_count} processed"
                else:
                    test_message = "No repositories configured"
            except Exception as e:
                test_message = f"GitHub connection test failed: {str(e)}"
        else:
            test_message = f"Connection test not implemented for {request.source_type}"
        
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Update connection health
        health_status = "healthy" if connection_healthy else "unhealthy"
        health_data = {
            "health_status": health_status,
            "error": None if connection_healthy else test_message
        }
        mongo_client.update_connection_health(request.email, request.source_type, health_data)
        
        # Add test event
        event_data = {
            "event_type": "test",
            "status": "success" if connection_healthy else "failure",
            "message": test_message,
            "metadata": {"response_time_ms": response_time_ms}
        }
        mongo_client.add_connection_event(request.email, request.source_type, event_data)
        
        return TestConnectionResponse(
            success=True,
            connection_healthy=connection_healthy,
            test_message=test_message,
            response_time_ms=response_time_ms
        )
        
    except Exception as e:
        print(f"Error testing connection for {request.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
