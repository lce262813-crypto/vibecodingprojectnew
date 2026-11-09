from datetime import date

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import DailyEntry, DailyEntryStatus, EmotionAnalysis, Encounter, User


def find_entry_for_date(
    db: Session, user: User, entry_date: date
) -> DailyEntry | None:
    return db.scalar(
        select(DailyEntry).where(
            DailyEntry.user_id == user.id,
            DailyEntry.entry_date == entry_date,
        )
    )


def find_owned_entry(db: Session, user: User, entry_id: str) -> DailyEntry | None:
    return db.scalar(
        select(DailyEntry)
        .options(
            selectinload(DailyEntry.analysis),
            selectinload(DailyEntry.photo),
            selectinload(DailyEntry.encounter).selectinload(Encounter.character),
        )
        .where(DailyEntry.id == entry_id, DailyEntry.user_id == user.id)
    )


def list_entries_for_range(
    db: Session,
    user: User,
    start_date: date,
    end_date: date,
) -> list[DailyEntry]:
    return list(
        db.scalars(
            select(DailyEntry)
            .options(
                selectinload(DailyEntry.analysis),
                selectinload(DailyEntry.photo),
                selectinload(DailyEntry.encounter).selectinload(Encounter.character),
            )
            .where(
                DailyEntry.user_id == user.id,
                DailyEntry.entry_date >= start_date,
                DailyEntry.entry_date <= end_date,
                DailyEntry.status.in_(["completed", "awaiting_confirmation", "uncertain", "ai_failed", "analyzing"]),
            )
            .order_by(DailyEntry.entry_date)
        ).all()
    )


def create_daily_entry(
    db: Session,
    user: User,
    entry_date: date,
    diary_text: str,
    title: str | None = None,
) -> DailyEntry:
    entry = DailyEntry(
        user_id=user.id,
        entry_date=entry_date,
        title=title,
        diary_text=diary_text,
        status=DailyEntryStatus.ANALYZING.value,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def save_draft(
    db: Session,
    user: User,
    entry_date: date,
    diary_text: str,
    title: str | None = None,
) -> DailyEntry:
    entry = find_entry_for_date(db, user, entry_date)
    if entry is None:
        entry = DailyEntry(
            user_id=user.id,
            entry_date=entry_date,
            title=title,
            diary_text=diary_text,
            status=DailyEntryStatus.DRAFT.value,
        )
        db.add(entry)
    else:
        entry.title = title
        entry.diary_text = diary_text
        entry.status = DailyEntryStatus.DRAFT.value
    db.commit()
    db.refresh(entry)
    return entry


def search_entries(
    db: Session,
    user: User,
    query: str = "",
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    emotion: str | None = None,
) -> list[DailyEntry]:
    statement = (
        select(DailyEntry)
        .options(
            selectinload(DailyEntry.analysis),
            selectinload(DailyEntry.encounter),
        )
        .where(
            DailyEntry.user_id == user.id,
            DailyEntry.status.in_(
                ["completed", "ai_failed", "awaiting_confirmation", "uncertain", "analyzing"]
            ),
        )
    )
    if query:
        pattern = f"%{query}%"
        statement = statement.where(
            or_(DailyEntry.title.ilike(pattern), DailyEntry.diary_text.ilike(pattern))
        )
    if date_from is not None:
        statement = statement.where(DailyEntry.entry_date >= date_from)
    if date_to is not None:
        statement = statement.where(DailyEntry.entry_date <= date_to)
    if emotion is not None:
        statement = statement.join(DailyEntry.analysis).where(
            EmotionAnalysis.primary_emotion == emotion
        )
    return list(
        db.scalars(
            statement.order_by(DailyEntry.entry_date.desc()).limit(100)
        ).all()
    )
