from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.auth_session import AuthSession
    from app.models.character import Character
    from app.models.daily_entry import DailyEntry
    from app.models.owned_furniture import OwnedFurniture


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nickname: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    coins: Mapped[int] = mapped_column(Integer, default=0)
    avatar_file: Mapped[str | None] = mapped_column(String(100), nullable=True)
    representative_character_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    theme: Mapped[str] = mapped_column(String(20), default="cream")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_time: Mapped[str] = mapped_column(String(5), default="21:00")
    room_background: Mapped[str] = mapped_column(String(20), default="cream")
    tutorial_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    tutorial_step: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    daily_entries: Mapped[list["DailyEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    characters: Mapped[list["Character"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    furniture: Mapped[list["OwnedFurniture"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
