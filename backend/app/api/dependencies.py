from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import AuthSession, User
from app.services.security import hash_session_token

DatabaseSession = Annotated[Session, Depends(get_db)]


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_current_auth_session(request: Request, db: DatabaseSession) -> AuthSession:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == hash_session_token(token),
            AuthSession.revoked_at.is_(None),
        )
    )
    if auth_session is None or _as_utc(auth_session.expires_at) <= datetime.now(
        timezone.utc
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return auth_session


CurrentAuthSession = Annotated[AuthSession, Depends(get_current_auth_session)]


def get_current_user(auth_session: CurrentAuthSession, db: DatabaseSession) -> User:
    user = db.get(User, auth_session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
