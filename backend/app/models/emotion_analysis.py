from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.daily_entry import DailyEntry


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    daily_entry_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("daily_entries.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    base_emotions: Mapped[dict[str, int]] = mapped_column(JSON)
    primary_emotion: Mapped[str] = mapped_column(String(30))
    secondary_emotions: Mapped[list[str]] = mapped_column(JSON)
    detail_states: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    energy: Mapped[int] = mapped_column(Integer)
    keywords: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    event_summary: Mapped[str] = mapped_column(Text)
    display_emotions: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    analysis_mode: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    daily_entry: Mapped["DailyEntry"] = relationship(back_populates="analysis")
