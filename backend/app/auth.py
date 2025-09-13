from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Header, HTTPException
from constants import SECRET_KEY


def create_jwt_token(email: str) -> dict:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=24)

    payload = {"sub": email, "iat": now, "exp": expires_at}

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    return {
        "token": token,
        "created_at": now,
        "expires_at": expires_at,
    }


def try_auth_user(auth_token: str) -> bool:
    try:
        jwt.decode(auth_token, SECRET_KEY, algorithms=["HS256"])
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False


def verify_auth_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Invalid authorization header format"
        )

    token = authorization.split(" ")[1]

    if not try_auth_user(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return token
