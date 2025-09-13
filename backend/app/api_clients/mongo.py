import pymongo
from passlib.context import CryptContext

from models import (
    AccountDetails,
    LoginDetails,
)
from constants import MONGO_USERNAME, MONGO_PASSWORD


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

    def create_account(self, account_details: AccountDetails) -> bool:
        if self.user_exists(account_details.email):
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
                return {"github": False, "linear": False}
        except Exception as e:
            print(f"Error getting user integrations for {email}: {e}")
            return {"github": False, "linear": False}

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


mongo_client = MongoClient()
