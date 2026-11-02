from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.character_share import CharacterShare
    from app.models.encounter import Encounter
    from app.models.user import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Character(Base):
    __tablename__ = "characters"
    __table_args__ = (
        UniqueConstraint("user_id", "fingerprint", name="uq_characters_user_fingerprint"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    fingerprint: Mapped[str] = mapped_column(String(160))
    algorithm_version: Mapped[str] = mapped_column(String(20), default="v1")
    seed: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(12))
    body_part: Mapped[str] = mapped_column(String(30))
    palette: Mapped[str] = mapped_column(String(30))
    eyebrow_part: Mapped[str] = mapped_column(String(30))
    eye_part: Mapped[str] = mapped_column(String(30))
    mouth_part: Mapped[str] = mapped_column(String(30))
    mutation_part: Mapped[str | None] = mapped_column(String(30), nullable=True)
    behavior_type: Mapped[str] = mapped_column(String(30))
    is_resident: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    user: Mapped["User"] = relationship(back_populates="characters")
    encounters: Mapped[list["Encounter"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )
    shares: Mapped[list["CharacterShare"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )
