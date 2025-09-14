import pymongo
from passlib.context import CryptContext

from app.models import (
    AccountDetails,
    LoginDetails,
)
from app.constants import MONGO_USERNAME, MONGO_PASSWORD


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class MongoClient:
    def __init__(self):
        self.client = pymongo.MongoClient(
            f"mongodb+srv://{MONGO_USERNAME}:{MONGO_PASSWORD}"
            "@cluster0.ns4xyla.mongodb.net/"
            "?retryWrites=true&w=majority&appName=Cluster0"
        )
        self.db = self.client.users
        self.users = self.db.users

    def user_exists(self, email: str) -> bool:
        """
        Check if a user with the given email exists.
        Returns True if found, False otherwise.
        """
        try:
            return bool(self.users.find_one({"email": email}))
        except Exception as e:
            print(f"Error checking if user exists for {email}: {e}")
            return False

    def username_exists(self, username: str) -> bool:
        """
        Check if a user with the given username exists.
        Returns True if found, False otherwise.
        """
        try:
            return bool(self.users.find_one({"username": username}))
        except Exception as e:
            print(f"Error checking if username exists for {username}: {e}")
            return False

    def create_account(self, account_details: AccountDetails) -> bool:
        if self.user_exists(account_details.email):
            return False
        
        if self.username_exists(account_details.username):
            return False

        user_doc = {
            "email": account_details.email,
            "password": pwd_context.hash(account_details.password),
            "username": account_details.username,
        }
        self.users.insert_one(user_doc)
        return True

    def verify_account(self, login_details: LoginDetails) -> bool:
        try:
            user = self.users.find_one({"email": login_details.email})
            if user and pwd_context.verify(
                login_details.password, user.get("password")
            ):
                return True
            return False
        except Exception as e:
            print(f"Error verifying account for {login_details.email}: {e}")
            return False

    def update_user_integrations(
        self, email: str, integration: str, is_enabled: bool
    ) -> bool:
        try:
            # Use dot notation to update specific field within integrations object
            update_field = f"integrations.{integration}"
            self.users.update_one(
                {"email": email}, {"$set": {update_field: is_enabled}}
            )
            return True
        except Exception as e:
            print(f"Error updating user integrations for {email}: {e}")
            return False

    def get_user_integrations(self, email: str) -> dict:
        try:
            user = self.users.find_one({"email": email})
            if user and "integrations" in user:
                return user["integrations"]
            else:
                # Return default integrations if none exist
                return {"github": False, "linear": False, "slack": False}
        except Exception as e:
            print(f"Error getting user integrations for {email}: {e}")
            return {"github": False, "linear": False, "slack": False}

    def save_lesson(self, email: str, lesson_data: dict) -> str:
        """
        Save a lesson for a user. Creates lessons array if it doesn't exist.
        Returns the lesson ID.
        """
        try:
            from datetime import datetime
            import uuid

            lesson_id = str(uuid.uuid4())
            lesson_doc = {
                "id": lesson_id,
                "created_at": datetime.utcnow(),
                **lesson_data,
            }

            # Use $push to add lesson to lessons array, creating it if it doesn't exist
            self.users.update_one({"email": email}, {"$push": {"lessons": lesson_doc}})

            return lesson_id
        except Exception as e:
            print(f"Error saving lesson for {email}: {e}")
            raise e

    def save_new_lesson(self, lesson_dict: dict) -> str:
        """
        Save a new lesson structure for a user. 
        Returns the lesson ID.
        """
        try:
            email = lesson_dict.get("user_email")
            if not email:
                raise ValueError("user_email is required in lesson data")

            # Use $push to add lesson to lessons array, creating it if it doesn't exist
            self.users.update_one({"email": email}, {"$push": {"lessons": lesson_dict}})

            return lesson_dict.get("id")
        except Exception as e:
            print(f"Error saving new lesson: {e}")
            raise e

    def get_user_lesson_summaries(self, email: str) -> list:
        """
        Get lesson summaries for a user (id, title, description, duration, created_at).
        Returns empty list if no lessons exist.
        """
        try:
            user = self.users.find_one({"email": email})
            if user and "lessons" in user:
                # Return only summary fields for each lesson
                summaries = []
                for lesson in user["lessons"]:
                    summary = {
                        "id": lesson.get("id"),
                        "title": lesson.get("title"),
                        "description": lesson.get("description"),
                        "estimated_duration_minutes": lesson.get("estimated_duration_minutes", 15),
                        "created_at": lesson.get("created_at")
                    }
                    summaries.append(summary)
                return summaries
            else:
                return []
        except Exception as e:
            print(f"Error getting user lesson summaries for {email}: {e}")
            return []

    def get_user_lessons(self, email: str) -> list:
        """
        Get all lessons for a user.
        Returns empty list if no lessons exist.
        """
        try:
            user = self.users.find_one({"email": email})
            if user and "lessons" in user:
                return user["lessons"]
            else:
                return []
        except Exception as e:
            print(f"Error getting user lessons for {email}: {e}")
            return []

    def get_lesson_by_id(self, email: str, lesson_id: str) -> dict:
        """
        Get a specific lesson by ID for a user.
        Returns None if lesson not found.
        """
        try:
            user = self.users.find_one(
                {"email": email, "lessons.id": lesson_id}, {"lessons.$": 1}
            )
            if user and "lessons" in user and len(user["lessons"]) > 0:
                return user["lessons"][0]
            else:
                return None
        except Exception as e:
            print(f"Error getting lesson {lesson_id} for {email}: {e}")
            return None

    def get_username_by_email(self, email: str) -> str:
        try:
            return self.users.find_one({"email": email})["username"]
        except Exception as e:
            print(f"Error getting username by email {email}: {e}")
            return None

    def set_linear_api_key(self, email: str, api_key: str) -> bool:
        try:
            self.users.update_one(
                {"email": email}, {"$set": {"linear_api_key": api_key}}
            )
            return True
        except Exception as e:
            print(f"Error setting linear api key for {email}: {e}")
            return False

    def get_linear_api_key(self, email: str) -> str:
        try:
            return self.users.find_one({"email": email})["linear_api_key"]
        except Exception as e:
            print(f"Error getting linear api key for {email}: {e}")
            return None

    def set_slack_api_key(self, email: str, api_key: str) -> bool:
        try:
            self.users.update_one(
                {"email": email}, {"$set": {"slack_api_key": api_key}}
            )
            return True
        except Exception as e:
            print(f"Error setting slack api key for {email}: {e}")
            return False
    
    def get_slack_api_key(self, email: str) -> str:
        try:
            return self.users.find_one({"email": email})["slack_api_key"]
        except Exception as e:
            print(f"Error getting slack api key for {email}: {e}")
            return None

    def add_repository(self, email: str, repository_data: dict) -> str:
        """
        Add a repository to user's repositories list.
        Returns the repository ID.
        """
        try:
            import uuid
            from datetime import datetime
            
            repository_id = str(uuid.uuid4())
            repository_doc = {
                "id": repository_id,
                "name": repository_data.get("name"),
                "url": repository_data.get("url"),
                "added_at": datetime.utcnow(),
                "is_processed": False,
                **repository_data
            }

            # Use $push to add repository to repositories array
            self.users.update_one({"email": email}, {"$push": {"repositories": repository_doc}})
            return repository_id
        except Exception as e:
            print(f"Error adding repository for {email}: {e}")
            raise e

    def remove_repository(self, email: str, repository_id: str) -> bool:
        """
        Remove a repository from user's repositories list.
        Returns True if successful, False otherwise.
        """
        try:
            result = self.users.update_one(
                {"email": email}, 
                {"$pull": {"repositories": {"id": repository_id}}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error removing repository {repository_id} for {email}: {e}")
            return False

    def get_user_repositories(self, email: str) -> list:
        """
        Get all repositories for a user.
        Returns empty list if no repositories exist.
        """
        try:
            user = self.users.find_one({"email": email})
            if user and "repositories" in user:
                return user["repositories"]
            else:
                return []
        except Exception as e:
            print(f"Error getting user repositories for {email}: {e}")
            return []

    def update_repository_processed_status(self, email: str, repository_id: str, is_processed: bool) -> bool:
        """
        Update the processed status of a repository.
        Returns True if successful, False otherwise.
        """
        try:
            result = self.users.update_one(
                {"email": email, "repositories.id": repository_id},
                {"$set": {"repositories.$.is_processed": is_processed}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating repository processed status for {email}: {e}")
            return False

    def get_user_profile(self, email: str) -> dict:
        """
        Get complete user profile including repositories and integrations.
        """
        try:
            user = self.users.find_one({"email": email})
            if not user:
                return None
            
            # Remove sensitive data
            user_data = {
                "email": user.get("email"),
                "username": user.get("username"),
                "created_at": user.get("created_at")
            }
            
            repositories = user.get("repositories", [])
            integrations = self.get_user_integrations(email)
            
            return {
                "user": user_data,
                "repositories": repositories,
                "integrations": integrations
            }
        except Exception as e:
            print(f"Error getting user profile for {email}: {e}")
            return None

    def save_interactive_lesson_session(self, session_data: dict) -> str:
        """
        Save an interactive lesson session.
        Returns the session ID.
        """
        try:
            # Save to a separate collection for interactive lesson sessions
            interactive_lessons_collection = self.db.interactive_lessons
            result = interactive_lessons_collection.insert_one(session_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving interactive lesson session: {e}")
            raise e

    def get_interactive_lesson_session(self, session_id: str, user_email: str) -> dict:
        """
        Get an interactive lesson session by ID and user email.
        Returns None if not found.
        """
        try:
            interactive_lessons_collection = self.db.interactive_lessons
            session = interactive_lessons_collection.find_one({
                "id": session_id,
                "user_email": user_email
            })
            return session
        except Exception as e:
            print(f"Error getting interactive lesson session {session_id}: {e}")
            return None

    def update_interactive_lesson_session(self, session_data: dict):
        """
        Update an interactive lesson session.
        """
        try:
            interactive_lessons_collection = self.db.interactive_lessons
            interactive_lessons_collection.update_one(
                {"id": session_data["id"], "user_email": session_data["user_email"]},
                {"$set": session_data}
            )
        except Exception as e:
            print(f"Error updating interactive lesson session: {e}")
            raise e

    def get_user_interactive_lesson_sessions(self, email: str) -> list:
        """
        Get all interactive lesson sessions for a user.
        Returns empty list if no sessions exist.
        """
        try:
            interactive_lessons_collection = self.db.interactive_lessons
            sessions = list(interactive_lessons_collection.find(
                {"user_email": email}
            ).sort("created_at", -1))
            return sessions
        except Exception as e:
            print(f"Error getting user interactive lesson sessions for {email}: {e}")
            return []

    def update_lesson_slide(self, email: str, lesson_id: str, slide_index: int, slide_data: dict):
        """
        Update a specific slide within a lesson.
        """
        try:
            self.users.update_one(
                {"email": email, "lessons.id": lesson_id},
                {"$set": {f"lessons.$.slides.{slide_index}": slide_data}}
            )
        except Exception as e:
            print(f"Error updating lesson slide for {email}: {e}")
            raise e

    def delete_lesson(self, lesson_id: str) -> bool:
        """
        Delete a lesson by ID from all users.
        Returns True if lesson was found and deleted.
        """
        try:
            # Remove the lesson from all users who have it
            result = self.users.update_many(
                {"lessons.id": lesson_id},
                {"$pull": {"lessons": {"id": lesson_id}}}
            )
            
            # Also remove progress for this lesson
            self.db.lesson_progress.delete_many({"lesson_id": lesson_id})
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error deleting lesson {lesson_id}: {e}")
            return False

    def save_lesson_progress(self, progress_data: dict) -> bool:
        """
        Save or update lesson progress for a user.
        """
        try:
            from datetime import datetime
            
            # Update or insert progress
            progress_data["last_accessed_at"] = datetime.utcnow()
            
            self.db.lesson_progress.update_one(
                {"lesson_id": progress_data["lesson_id"], "user_email": progress_data["user_email"]},
                {"$set": progress_data},
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error saving lesson progress: {e}")
            return False

    def get_lesson_progress(self, user_email: str, lesson_id: str) -> dict:
        """
        Get lesson progress for a specific user and lesson.
        Returns None if no progress exists.
        """
        try:
            progress = self.db.lesson_progress.find_one({
                "user_email": user_email,
                "lesson_id": lesson_id
            })
            return progress
        except Exception as e:
            print(f"Error getting lesson progress: {e}")
            return None

    def get_user_lesson_summaries_with_progress(self, email: str) -> list:
        """
        Get lesson summaries for a user with progress information.
        Returns empty list if no lessons exist.
        """
        try:
            user = self.users.find_one({"email": email})
            if user and "lessons" in user:
                # Get all progress for this user
                progress_cursor = self.db.lesson_progress.find({"user_email": email})
                progress_dict = {p["lesson_id"]: p for p in progress_cursor}
                
                # Return summary fields with progress info for each lesson
                summaries = []
                for lesson in user["lessons"]:
                    lesson_id = lesson.get("id")
                    progress = progress_dict.get(lesson_id, {})
                    
                    summary = {
                        "id": lesson_id,
                        "title": lesson.get("title"),
                        "description": lesson.get("description"),
                        "estimated_duration_minutes": lesson.get("estimated_duration_minutes", 15),
                        "created_at": lesson.get("created_at"),
                        "is_completed": progress.get("is_completed", False),
                        "completion_percentage": progress.get("completion_percentage", 0.0),
                        "completed_at": progress.get("completed_at")
                    }
                    summaries.append(summary)
                return summaries
            else:
                return []
        except Exception as e:
            print(f"Error getting user lesson summaries with progress for {email}: {e}")
            return []

    # Enhanced Connection State Management Methods
    
    def get_connection_states(self, email: str) -> list:
        """
        Get all connection states for a user.
        Returns empty list if no states exist.
        """
        try:
            connection_states_collection = self.db.connection_states
            states = list(connection_states_collection.find(
                {"user_email": email}
            ).sort("updated_at", -1))
            return states
        except Exception as e:
            print(f"Error getting connection states for {email}: {e}")
            return []

    def create_or_update_connection_state(self, connection_data: dict) -> str:
        """
        Create or update a connection state.
        Returns the connection ID.
        """
        try:
            from datetime import datetime
            import uuid
            
            connection_states_collection = self.db.connection_states
            
            # Check if connection already exists
            existing = connection_states_collection.find_one({
                "user_email": connection_data["user_email"],
                "source_type": connection_data["source_type"]
            })
            
            if existing:
                # Update existing connection
                connection_data["updated_at"] = datetime.utcnow()
                connection_states_collection.update_one(
                    {"id": existing["id"]},
                    {"$set": connection_data}
                )
                return existing["id"]
            else:
                # Create new connection
                connection_id = str(uuid.uuid4())
                connection_data["id"] = connection_id
                connection_data["created_at"] = datetime.utcnow()
                connection_data["updated_at"] = datetime.utcnow()
                connection_states_collection.insert_one(connection_data)
                return connection_id
                
        except Exception as e:
            print(f"Error creating/updating connection state: {e}")
            raise e

    def add_connection_event(self, email: str, source_type: str, event_data: dict):
        """
        Add an event to a connection's history.
        Keeps only the last 10 events per connection.
        """
        try:
            from datetime import datetime
            import uuid
            
            connection_states_collection = self.db.connection_states
            
            # Add event metadata
            event_data["id"] = str(uuid.uuid4())
            event_data["timestamp"] = datetime.utcnow()
            
            # Add event to connection and keep only last 10
            connection_states_collection.update_one(
                {
                    "user_email": email,
                    "source_type": source_type
                },
                {
                    "$push": {
                        "recent_events": {
                            "$each": [event_data],
                            "$slice": -10  # Keep only last 10 events
                        }
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
        except Exception as e:
            print(f"Error adding connection event for {email}: {e}")
            raise e

    def update_connection_health(self, email: str, source_type: str, health_data: dict):
        """
        Update connection health status and error tracking.
        """
        try:
            from datetime import datetime
            
            connection_states_collection = self.db.connection_states
            
            update_data = {
                "health_status": health_data.get("health_status"),
                "updated_at": datetime.utcnow(),
                "last_tested_at": datetime.utcnow()
            }
            
            # Update error tracking if provided
            if "error" in health_data:
                if health_data["error"]:
                    # Increment error count and set last error
                    connection_states_collection.update_one(
                        {"user_email": email, "source_type": source_type},
                        {
                            "$set": {
                                **update_data,
                                "last_error": health_data["error"],
                                "last_error_at": datetime.utcnow()
                            },
                            "$inc": {"error_count": 1}
                        }
                    )
                else:
                    # Reset error count on success
                    update_data["error_count"] = 0
                    connection_states_collection.update_one(
                        {"user_email": email, "source_type": source_type},
                        {"$set": update_data}
                    )
            else:
                connection_states_collection.update_one(
                    {"user_email": email, "source_type": source_type},
                    {"$set": update_data}
                )
                
        except Exception as e:
            print(f"Error updating connection health for {email}: {e}")
            raise e

    def update_connection_sync_info(self, email: str, source_type: str, sync_data: dict):
        """
        Update connection sync information.
        """
        try:
            from datetime import datetime
            
            connection_states_collection = self.db.connection_states
            
            update_data = {
                "last_sync_at": sync_data.get("last_sync_at", datetime.utcnow()),
                "last_sync_status": sync_data.get("last_sync_status"),
                "data_count": sync_data.get("data_count", 0),
                "updated_at": datetime.utcnow()
            }
            
            # Remove None values
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            connection_states_collection.update_one(
                {"user_email": email, "source_type": source_type},
                {"$set": update_data}
            )
            
        except Exception as e:
            print(f"Error updating connection sync info for {email}: {e}")
            raise e

    def get_connection_state_summary(self, email: str) -> dict:
        """
        Get a summary of all connection states for a user.
        """
        try:
            states = self.get_connection_states(email)
            
            summary = {
                "total_connections": len(states),
                "connected_count": len([s for s in states if s.get("is_connected", False)]),
                "healthy_count": len([s for s in states if s.get("health_status") == "healthy"]),
                "error_count": len([s for s in states if s.get("health_status") == "unhealthy"]),
                "last_sync_count": len([s for s in states if s.get("last_sync_at")]),
                "sources_by_type": {}
            }
            
            # Count by source type
            for state in states:
                source_type = state.get("source_type", "unknown")
                if source_type not in summary["sources_by_type"]:
                    summary["sources_by_type"][source_type] = {
                        "total": 0,
                        "connected": 0,
                        "healthy": 0
                    }
                
                summary["sources_by_type"][source_type]["total"] += 1
                if state.get("is_connected", False):
                    summary["sources_by_type"][source_type]["connected"] += 1
                if state.get("health_status") == "healthy":
                    summary["sources_by_type"][source_type]["healthy"] += 1
            
            return summary
            
        except Exception as e:
            print(f"Error getting connection state summary for {email}: {e}")
            return {}

    def initialize_default_connection_states(self, email: str):
        """
        Initialize default connection states for a new user.
        """
        try:
            default_sources = [
                {
                    "user_email": email,
                    "source_type": "github",
                    "source_name": "GitHub Repositories",
                    "is_connected": False,
                    "connection_status": "disconnected",
                    "health_status": "unknown",
                    "credentials_set": False,
                    "data_count": 0,
                    "error_count": 0,
                    "recent_events": []
                },
                {
                    "user_email": email,
                    "source_type": "linear",
                    "source_name": "Linear Issues",
                    "is_connected": False,
                    "connection_status": "disconnected", 
                    "health_status": "unknown",
                    "credentials_set": False,
                    "data_count": 0,
                    "error_count": 0,
                    "recent_events": []
                },
                {
                    "user_email": email,
                    "source_type": "slack",
                    "source_name": "Slack Messages",
                    "is_connected": False,
                    "connection_status": "disconnected",
                    "health_status": "unknown", 
                    "credentials_set": False,
                    "data_count": 0,
                    "error_count": 0,
                    "recent_events": []
                }
            ]
            
            for source_data in default_sources:
                self.create_or_update_connection_state(source_data)
                
        except Exception as e:
            print(f"Error initializing default connection states for {email}: {e}")
            raise e


mongo_client = MongoClient()
