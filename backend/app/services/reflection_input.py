"""Builds what the AI reflection may read.

Statistics are computed here so the model only interprets them. Diary text is cut to a budget and
never logged. Crisis signals are detected here too, so that path does not depend on the model.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Iterable

from app.models import DailyEntry
from app.schemas.reports import EmotionReportResponse, ReportPeriod
from app.services.reports import final_emotions

MAX_TOTAL_DIARY_CHARS = 7000
MAX_ENTRY_CHARS = 900
MIN_ENTRY_CHARS = 200
MAX_CHANGES = 8
MAX_REPEATED_CONTEXTS = 8

# Direct statements only. A false alarm shows a gentle note; a miss would show cheerful advice.
CRISIS_PATTERNS = re.compile(
    r"죽고\s*싶|자살|자해|극단적\s*(?:선택|인\s*생각)|목숨을\s*끊|삶을\s*끝|생을\s*마감|"
    r"사라지고\s*싶|없어지고\s*싶|살고\s*싶지\s*않|살기\s*싫|그만\s*살고|세상을\s*떠나고\s*싶"
)


@dataclass(frozen=True)
class ReflectionEntry:
    entry_date: date
    full_text: str
    excerpt: str
    title: str | None
    primary_emotion: str
    emotions: list[dict[str, Any]]
    relationship: dict[str, str] | None
    summary: str | None
    terms: list[str]

    def for_model(self) -> dict[str, Any]:
        return {
            "date": self.entry_date.isoformat(),
            "title": self.title,
            "diary_excerpt": self.excerpt,
            "confirmed_primary_emotion": self.primary_emotion,
            "emotions": self.emotions,
            "relationship": self.relationship,
            "analysis_summary": self.summary,
            "mentioned": self.terms,
        }


@dataclass(frozen=True)
class ReflectionContext:
    period: ReportPeriod
    start_date: date
    end_date: date
    entries: list[ReflectionEntry]
    statistics: dict[str, Any]
    depth: str
    safety_signal: bool = False
    dates: set[date] = field(default_factory=set)
    custom_range: bool = False

    def for_model(self) -> dict[str, Any]:
        return {
            "period": self.period.value,
            "range": f"{self.start_date}~{self.end_date}",
            "data_depth": self.depth,
            "statistics": self.statistics,
            "entries": [entry.for_model() for entry in self.entries],
        }


def has_crisis_signal(text: str) -> bool:
    return bool(CRISIS_PATTERNS.search(text))


def excerpt_of(text: str, limit: int) -> str:
    """Cuts at a sentence end when one is near, so the model never reads half a thought as whole."""
    clean = " ".join(text.split())
    if len(clean) <= limit:
        return clean
    head = clean[:limit]
    stop = max(head.rfind(mark) for mark in (".", "!", "?", "…", "다 "))
    return (head[: stop + 1] if stop >= limit * 0.6 else head).rstrip() + " …(이하 생략)"


def _terms(entry: DailyEntry) -> list[str]:
    analysis = entry.analysis
    terms = list(analysis.objects or [])
    for keyword in analysis.keywords or []:
        text = str(keyword.get("text", "")).strip() if isinstance(keyword, dict) else ""
        if text:
            terms.append(text)
    return list(dict.fromkeys(terms))


def _relationship(entry: DailyEntry) -> dict[str, str] | None:
    review = entry.analysis.review
    if not (review and review.get("selected_emotion")):
        return None
    relationship = review.get("relationship") or {}
    return {
        "type": str(relationship.get("type", "")),
        "sequence": " → ".join(relationship.get("sequence") or []),
        "explanation": str(relationship.get("explanation", "")),
    }


def _model_emotions(entry: DailyEntry) -> list[dict[str, Any]]:
    return [
        {
            "emotion": item["emotion"],
            "expression_stage_1_to_5": item["intensity"],
            "is_primary": item["is_primary"],
            "quote_from_diary": item["evidence"],
            "related_event": item["event"],
        }
        for item in final_emotions(entry.analysis)
    ]


def _changes(entries: list[ReflectionEntry]) -> list[dict[str, str]]:
    moments = [
        {"from_date": before.entry_date.isoformat(), "to_date": after.entry_date.isoformat(),
         "from": before.primary_emotion, "to": after.primary_emotion}
        for before, after in zip(entries, entries[1:])
        if before.primary_emotion != after.primary_emotion
    ]
    return moments[:MAX_CHANGES]


def _repeated_contexts(entries: list[ReflectionEntry]) -> list[dict[str, Any]]:
    dates: dict[str, list[str]] = defaultdict(list)
    emotions: dict[str, Counter[str]] = defaultdict(Counter)
    for entry in entries:
        for term in entry.terms:
            dates[term].append(entry.entry_date.isoformat())
            emotions[term][entry.primary_emotion] += 1
    repeated = [term for term, days in dates.items() if len(days) >= 2]
    repeated.sort(key=lambda term: (-len(dates[term]), term))
    return [
        {"term": term, "dates": dates[term], "primary_emotions": dict(emotions[term])}
        for term in repeated[:MAX_REPEATED_CONTEXTS]
    ]


def _weekly_flow(entries: list[ReflectionEntry], start: date) -> list[dict[str, Any]]:
    weeks: dict[int, list[ReflectionEntry]] = defaultdict(list)
    for entry in entries:
        weeks[(entry.entry_date - start).days // 7].append(entry)
    return [
        {
            "week_of_month": index + 1,
            "diary_count": len(items),
            "primary_emotions": dict(Counter(item.primary_emotion for item in items)),
        }
        for index, items in sorted(weeks.items())
    ]


def _depth(diary_count: int) -> str:
    if diary_count <= 1:
        return "single"
    return "few" if diary_count <= 3 else "enough"


def build_reflection_context(
    report: EmotionReportResponse, source_entries: Iterable[DailyEntry]
) -> ReflectionContext:
    analyzed = [
        entry for entry in source_entries
        if entry.analysis is not None and entry.analysis.primary_emotion and entry.diary_text
    ]
    per_entry = max(MIN_ENTRY_CHARS, min(MAX_ENTRY_CHARS, MAX_TOTAL_DIARY_CHARS // max(len(analyzed), 1)))
    entries = [
        ReflectionEntry(
            entry_date=entry.entry_date,
            full_text=entry.diary_text,
            excerpt=excerpt_of(entry.diary_text, per_entry),
            title=entry.title,
            primary_emotion=entry.analysis.primary_emotion,
            emotions=_model_emotions(entry),
            relationship=_relationship(entry),
            summary=entry.analysis.event_summary,
            terms=_terms(entry),
        )
        for entry in analyzed
    ]
    statistics: dict[str, Any] = {
        "diary_count": report.diary_count,
        "primary_emotion_counts": {item.emotion.value: item.count for item in report.emotion_counts if item.count},
        "emotion_appearances": {item.emotion.value: item.appearance_count for item in report.emotion_counts if item.appearance_count},
        "emotion_group_counts": {item.label: item.count for item in report.group_counts if item.count},
        "average_expression_stage_1_to_4": report.average_expression_intensity,
        "days_where_primary_emotion_changed": _changes(entries),
        "same_day_transitions": [
            {"date": entry.entry_date.isoformat(), **entry.relationship}
            for entry in entries if entry.relationship and entry.relationship["type"] == "TRANSITION"
        ],
        "repeated_contexts": _repeated_contexts(entries),
    }
    if report.previous is not None:
        statistics["previous_period"] = report.previous.model_dump(mode="json")
    if report.period == ReportPeriod.MONTH:
        statistics["weekly_flow"] = _weekly_flow(entries, report.start_date)
    return ReflectionContext(
        period=report.period,
        start_date=report.start_date,
        end_date=report.end_date,
        entries=entries,
        statistics=statistics,
        depth=_depth(len(entries)),
        safety_signal=any(has_crisis_signal(entry.full_text) for entry in entries),
        dates={entry.entry_date for entry in entries},
        custom_range=report.custom_range,
    )
