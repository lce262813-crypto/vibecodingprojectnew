from __future__ import annotations

from calendar import monthrange
from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import DailyEntry, DailyEntryStatus, Encounter, User
from app.schemas.emotions import BaseEmotionKey
from app.schemas.reports import (
    EmotionCount,
    EmotionGroupCount,
    EmotionReportResponse,
    EmotionTrendPoint,
    KeywordCount,
    PeriodComparison,
    ReportPeriod,
)

EMOTION_GROUPS: dict[str, tuple[str, tuple[str, ...]]] = {
    "achievement": ("행복·성취", ("joy", "pride", "moved")),
    "flutter": ("두근거림·자의식", ("excitement", "shyness")),
    "low_energy": ("안정·저활력", ("calm", "fatigue", "lethargy")),
    "loss": ("상실·침체", ("sadness", "loneliness", "disappointment")),
    "anger": ("분노·불쾌", ("anger", "irritation")),
    "tension": ("긴장·인지적 혼란", ("anxiety", "embarrassment", "confusion")),
}


def period_bounds(period: ReportPeriod, anchor: date) -> tuple[date, date]:
    if period == ReportPeriod.WEEK:
        start = anchor - timedelta(days=anchor.weekday())
        return start, start + timedelta(days=6)
    start = anchor.replace(day=1)
    return start, anchor.replace(day=monthrange(anchor.year, anchor.month)[1])


MAX_CUSTOM_RANGE_DAYS = 366
WEEK_STYLE_MAX_DAYS = 14


def custom_range_error(start_date: date, end_date: date) -> str | None:
    if start_date > end_date:
        return "시작일은 종료일보다 늦을 수 없습니다."
    if (end_date - start_date).days + 1 > MAX_CUSTOM_RANGE_DAYS:
        return "기간은 최대 1년까지 선택할 수 있습니다."
    return None


def custom_range_period(start_date: date, end_date: date) -> ReportPeriod:
    """A chosen range reads like a week when it is short and like a month when it is long."""
    days = (end_date - start_date).days + 1
    return ReportPeriod.WEEK if days <= WEEK_STYLE_MAX_DAYS else ReportPeriod.MONTH


def previous_custom_bounds(start_date: date, end_date: date) -> tuple[date, date]:
    """The same number of days, ending the day before the range starts."""
    before_end = start_date - timedelta(days=1)
    return before_end - (end_date - start_date), before_end


def previous_period_bounds(period: ReportPeriod, start_date: date) -> tuple[date, date]:
    anchor = start_date - timedelta(days=1)
    return period_bounds(period, anchor)


def list_report_entries(
    db: Session, user: User, start_date: date, end_date: date
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
            .order_by(DailyEntry.entry_date, DailyEntry.created_at)
        ).all()
    )


def _intensity(analysis: Any) -> int:
    scores = analysis.base_emotions or {}
    value = scores.get(analysis.primary_emotion, 0)
    return max(0, min(100, int(value)))


def expression_intensity(analysis) -> int:
    if analysis.review and analysis.review.get("selected_emotion"):
        for item in analysis.review["emotions"]:
            if item["emotion"] == analysis.primary_emotion:
                return item["intensity"]
    return min(4, max(1, (_intensity(analysis) + 24) // 25))


def final_emotions(analysis: Any) -> list[dict[str, Any]]:
    """The emotions the user ended up with: their confirmed review, or the saved analysis for older diaries."""
    primary = analysis.primary_emotion
    if analysis.review and analysis.review.get("selected_emotion"):
        items = [
            {
                "emotion": item["emotion"],
                "intensity": item["intensity"],
                "is_primary": item["emotion"] == primary,
                "evidence": item.get("evidence"),
                "event": item.get("event") or "",
            }
            for item in analysis.review["emotions"]
        ]
        return sorted(items, key=lambda item: not item["is_primary"])
    scores = analysis.base_emotions or {}
    items = [{"emotion": primary, "intensity": expression_intensity(analysis), "is_primary": True, "evidence": None, "event": ""}]
    for emotion in analysis.secondary_emotions or []:
        if emotion != primary:
            stage = min(4, max(1, (max(0, min(100, int(scores.get(emotion, 0)))) + 24) // 25))
            items.append({"emotion": emotion, "intensity": stage, "is_primary": False, "evidence": None, "event": ""})
    return items


def period_comparison(entries: Iterable[DailyEntry], start_date: date, end_date: date) -> PeriodComparison | None:
    analyzed = [entry for entry in entries if entry.analysis is not None and entry.analysis.primary_emotion]
    if not analyzed:
        return None
    counts = Counter(entry.analysis.primary_emotion for entry in analyzed)
    return PeriodComparison(
        start_date=start_date,
        end_date=end_date,
        diary_days=len({entry.entry_date for entry in analyzed}),
        most_frequent_primary=BaseEmotionKey(sorted(counts, key=lambda value: (-counts[value], value))[0]),
        average_expression_intensity=round(sum(expression_intensity(entry.analysis) for entry in analyzed) / len(analyzed), 1),
    )


def build_emotion_report(
    entries: Iterable[DailyEntry],
    period: ReportPeriod,
    start_date: date,
    end_date: date,
    previous: PeriodComparison | None = None,
    custom_range: bool = False,
) -> EmotionReportResponse:
    analyzed = [entry for entry in entries if entry.analysis is not None and entry.status == "completed" and entry.analysis.primary_emotion]
    emotion_counts = Counter(entry.analysis.primary_emotion for entry in analyzed)
    appearance_counts: Counter[str] = Counter()
    for entry in analyzed:
        appearance_counts.update({item["emotion"] for item in final_emotions(entry.analysis)})
    all_emotions = [emotion.value for emotion in BaseEmotionKey]
    intensities = [_intensity(entry.analysis) for entry in analyzed]

    keyword_counts: Counter[str] = Counter()
    for entry in analyzed:
        if entry.analysis.review:
            keyword_counts.update(set(entry.analysis.objects or []))
            continue
        for keyword in entry.analysis.keywords or []:
            text = str(keyword.get("text", "")).strip() if isinstance(keyword, dict) else ""
            if text:
                keyword_counts[text] += 1

    group_counts: list[EmotionGroupCount] = []
    for group, (label, emotions) in EMOTION_GROUPS.items():
        group_counts.append(
            EmotionGroupCount(
                group=group,
                label=label,
                count=sum(emotion_counts[emotion] for emotion in emotions),
            )
        )

    per_date: dict[date, list[DailyEntry]] = defaultdict(list)
    for entry in analyzed:
        per_date[entry.entry_date].append(entry)
    trend: list[EmotionTrendPoint] = []
    for entry_date, day_entries in sorted(per_date.items()):
        day_counts = Counter(item.analysis.primary_emotion for item in day_entries)
        dominant = sorted(day_counts, key=lambda value: (-day_counts[value], value))[0]
        day_intensities = [_intensity(item.analysis) for item in day_entries]
        lead = next(item for item in day_entries if item.analysis.primary_emotion == dominant)
        co_emotions = dict.fromkeys(
            emotion["emotion"]
            for item in day_entries
            for emotion in final_emotions(item.analysis)
            if emotion["emotion"] != dominant
        )
        review = lead.analysis.review
        trend.append(
            EmotionTrendPoint(
                entry_date=entry_date,
                diary_count=len(day_entries),
                primary_emotion=BaseEmotionKey(dominant),
                average_intensity=round(sum(day_intensities) / len(day_intensities), 1),
                expression_intensity=round(sum(expression_intensity(item.analysis) for item in day_entries) / len(day_entries), 1),
                entry_id=lead.id,
                title=lead.title,
                summary=lead.analysis.event_summary,
                co_emotions=[BaseEmotionKey(emotion) for emotion in co_emotions],
                relationship_type=(review.get("relationship") or {}).get("type") if review else None,
            )
        )

    most_frequent = None
    if emotion_counts:
        most_frequent = BaseEmotionKey(
            sorted(emotion_counts, key=lambda value: (-emotion_counts[value], value))[0]
        )
    return EmotionReportResponse(
        period=period,
        start_date=start_date,
        end_date=end_date,
        diary_days=len({entry.entry_date for entry in analyzed}),
        diary_count=len(analyzed),
        most_frequent_primary=most_frequent,
        average_expression_intensity=round(sum(expression_intensity(entry.analysis) for entry in analyzed) / len(analyzed), 1) if analyzed else None,
        legacy_intensity_converted=any(not entry.analysis.review for entry in analyzed),
        emotion_counts=[
            EmotionCount(emotion=BaseEmotionKey(emotion), count=emotion_counts[emotion], appearance_count=appearance_counts[emotion])
            for emotion in all_emotions
        ],
        group_counts=group_counts,
        average_intensity=(
            round(sum(intensities) / len(intensities), 1) if intensities else None
        ),
        frequent_keywords=[
            KeywordCount(keyword=keyword, count=count)
            for keyword, count in sorted(
                keyword_counts.items(), key=lambda item: (-item[1], item[0])
            )[:8]
        ],
        trend=trend,
        previous=previous,
        custom_range=custom_range,
    )


def subtract_one_month(value: date) -> date:
    year = value.year if value.month > 1 else value.year - 1
    month = value.month - 1 if value.month > 1 else 12
    return date(year, month, min(value.day, monthrange(year, month)[1]))


def subtract_one_year(value: date) -> date:
    return date(value.year - 1, value.month, min(value.day, monthrange(value.year - 1, value.month)[1]))


def list_entries_on_date(db: Session, user: User, target: date) -> list[DailyEntry]:
    return list_report_entries(db, user, target, target)
