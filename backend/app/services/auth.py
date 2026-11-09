from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthSession, User
from app.services.security import (
    create_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)


def user_response(user: User):
    from app.schemas.auth import UserResponse
    from app.core.config import get_settings

    is_demo_account = user.email.casefold() == get_settings().demo_account_email.strip().casefold()

    return UserResponse(
        id=user.id,
        email=user.email,
        nickname=user.nickname,
        avatar_url="/api/account/avatar" if user.avatar_file else None,
        representative_character_id=user.representative_character_id,
        theme=user.theme,
        notifications_enabled=user.notifications_enabled,
        notification_time=user.notification_time,
        room_background=user.room_background,
        tutorial_completed=user.tutorial_completed_at is not None,
        tutorial_step=user.tutorial_step,
        is_demo_account=is_demo_account,
    )


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def find_user_by_nickname(db: Session, nickname: str) -> User | None:
    return db.scalar(select(User).where(User.nickname == nickname))


def create_user(db: Session, email: str, password: str, nickname: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        nickname=nickname,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = find_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def issue_session(db: Session, user: User, ttl_days: int) -> tuple[str, AuthSession]:
    token = create_session_token()
    session = AuthSession(
        token_hash=hash_session_token(token),
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=ttl_days),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session
