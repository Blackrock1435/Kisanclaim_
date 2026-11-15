from __future__ import annotations
import time
from collections import defaultdict, deque
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from .config import get_settings
from .db import get_db

_hasher = PasswordHash.recommended()  # Argon2id
bearer = HTTPBearer(auto_error=False)


def hash_password(p: str) -> str:
    return _hasher.hash(p)


def verify_password(p: str, h: str) -> bool:
    return _hasher.verify(p, h)


def make_token(user_id: int, role: str) -> str:
    s = get_settings()
    now = int(time.time())
    return jwt.encode({"sub": str(user_id), "role": role, "iat": now, "exp": now + s.access_token_minutes * 60},
                      s.secret_key, algorithm="HS256")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    from ..models.models import User
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        data = jwt.decode(creds.credentials, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or disabled")
    return user


def require_roles(*roles: str):
    def dep(user=Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission for this action")
        return user
    return dep


# Minimal in-memory rate limiter (single process). Use Redis / reverse-proxy limits in production.
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(prefix: str, limit: int, window: int = 60):
    def dep(request: Request):
        key = f"{prefix}:{request.client.host if request.client else 'x'}"
        now = time.time()
        q = _hits[key]
        while q and q[0] < now - window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many attempts. Please wait a minute and try again.")
        q.append(now)
    return dep
