from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.daily_entry import DailyEntry


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DiaryPhoto(Base):
    __tablename__ = "diary_photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    daily_entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_entries.id", ondelete="CASCADE"), unique=True, index=True
    )
    stored_name: Mapped[str] = mapped_column(String(100), unique=True)
    content_type: Mapped[str] = mapped_column(String(30))
    size_bytes: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    daily_entry: Mapped["DailyEntry"] = relationship(back_populates="photo")
