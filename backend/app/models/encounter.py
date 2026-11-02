from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.character import Character
    from app.models.daily_entry import DailyEntry


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("characters.id", ondelete="CASCADE"), index=True
    )
    daily_entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("daily_entries.id", ondelete="CASCADE"), unique=True, index=True
    )
    intensity_level: Mapped[int] = mapped_column(Integer)
    accessory_part: Mapped[str | None] = mapped_column(String(30), nullable=True)
    effect_parts: Mapped[list[str]] = mapped_column(JSON)
    dialogue_group: Mapped[str] = mapped_column(String(30))
    met_on: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    character: Mapped["Character"] = relationship(back_populates="encounters")
    daily_entry: Mapped["DailyEntry"] = relationship(back_populates="encounter")
