from datetime import date, datetime, timezone
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.diary_photo import DiaryPhoto
    from app.models.encounter import Encounter
    from app.models.emotion_analysis import EmotionAnalysis
    from app.models.user import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DailyEntryStatus(StrEnum):
    DRAFT = "draft"
    ANALYZING = "analyzing"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    UNCERTAIN = "uncertain"
    COMPLETED = "completed"
    AI_FAILED = "ai_failed"
    DELETED = "deleted"


class DailyEntry(Base):
    __tablename__ = "daily_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_daily_entries_user_date"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    diary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default=DailyEntryStatus.ANALYZING.value, index=True
    )
    analysis_token: Mapped[str | None] = mapped_column(String(36), nullable=True)
    analysis_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    analysis_mode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="daily_entries")
    analysis: Mapped["EmotionAnalysis | None"] = relationship(
        back_populates="daily_entry", cascade="all, delete-orphan", uselist=False
    )
    encounter: Mapped["Encounter | None"] = relationship(
        back_populates="daily_entry", cascade="all, delete-orphan", uselist=False
    )
    photo: Mapped["DiaryPhoto | None"] = relationship(
        back_populates="daily_entry", cascade="all, delete-orphan", uselist=False
    )
