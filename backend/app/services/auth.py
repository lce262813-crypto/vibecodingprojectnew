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
