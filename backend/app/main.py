from fastapi import FastAPI, HTTPException

from database_builder.linear_ingestion import LinearTicketIngester
from models import (
    RepositoryRequest,
    RepositoryResponse,
    AuthResponse,
    AccountDetails,
    LoginDetails,
    LessonRequest,
    LessonResponse,
    LessonContent,
    LinearTicketRequest,
    LinearTicketApiKeyRequest,
    ChatRequest,
    ChatResponse,
)
from fastapi.middleware.cors import CORSMiddleware
from auth import create_jwt_token
from api_clients.mongo import mongo_client
from database_builder.daytona_chunk_runner import DaytonaChunkRunner
from agent.agent import Agent
import json
import constants

app = FastAPI(
    title="Daytona Chunk Runner API",
    description="Simple API for processing GitHub repositories using Daytona containers",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000", "*"],  # tighten later
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
        if not mongo_client.create_account(account_data):
            raise HTTPException(status_code=400, detail="User already exists")

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


# @app.post("/create-lesson", response_model=LessonResponse)
# async def create_lesson(request: LessonRequest):
#     """
#     Create a lesson using the AI agent and save it to the user's MongoDB account.
#     """
#     try:
#         # Initialize the lesson agent
#         username = mongo_client.get_username_by_email(request.email)
#         agent = LessonAgent(index_name=f"{username}-user-database")

#         # Convert user context to dictionary
#         user_context = {
#             "role": request.role,
#             "experience": request.experience,
#             "focus_areas": request.focus_areas,
#         }

#         # Generate lesson using the agent
#         lesson_text = await agent.generate_lesson(request.topic, user_context)

#         # Parse the JSON response from the agent
#         try:
#             # Clean the response to extract JSON
#             lesson_text = lesson_text.strip()
#             if lesson_text.startswith("```json"):
#                 lesson_text = lesson_text[7:]
#             if lesson_text.endswith("```"):
#                 lesson_text = lesson_text[:-3]
#             lesson_text = lesson_text.strip()

#             lesson_data = json.loads(lesson_text)

#             # Create LessonContent object
#             lesson_content = LessonContent(**lesson_data)

#         except json.JSONDecodeError as e:
#             print(f"Failed to parse lesson JSON: {e}")
#             print(f"Raw response: {lesson_text}")
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"Failed to parse lesson response as JSON: {str(e)}",
#             )

#         # Save lesson to MongoDB
#         try:
#             lesson_id = mongo_client.save_lesson(
#                 request.email, lesson_content.model_dump()
#             )

#             return LessonResponse(
#                 success=True, lesson_id=lesson_id, lesson=lesson_content
#             )

#         except Exception as e:
#             print(f"Failed to save lesson to database: {e}")
#             raise HTTPException(
#                 status_code=500, detail=f"Failed to save lesson: {str(e)}"
#             )

#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"Error creating lesson: {e}")
#         return LessonResponse(success=False, error=str(e))


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


@app.get("/lessons/{email}")
async def get_user_lessons(email: str):
    """
    Get all lessons for a user.
    """
    try:
        lessons = mongo_client.get_user_lessons(email)
        return {"success": True, "lessons": lessons}
    except Exception as e:
        print(f"Error getting lessons for {email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
