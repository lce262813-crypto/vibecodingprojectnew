from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import DailyEntry, DailyEntryStatus, Encounter, User


def find_entry_for_date(
    db: Session, user: User, entry_date: date
) -> DailyEntry | None:
    return db.scalar(
        select(DailyEntry).where(
            DailyEntry.user_id == user.id,
            DailyEntry.entry_date == entry_date,
        )
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
                selectinload(DailyEntry.encounter).selectinload(Encounter.character),
            )
            .where(
                DailyEntry.user_id == user.id,
                DailyEntry.entry_date >= start_date,
                DailyEntry.entry_date <= end_date,
                DailyEntry.status == DailyEntryStatus.COMPLETED.value,
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
