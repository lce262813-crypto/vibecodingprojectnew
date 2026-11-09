from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.schemas.reports import (
    EmotionReportResponse,
    OnThisDayResponse,
    PastEntry,
    PastMoment,
    ReflectionResponse,
    ReportPeriod,
)
from app.services.character_generator import encounter_to_response
from app.services.clock import today_in_seoul
from app.services.reflection import (
    OpenAIReflectionGenerator,
    ReflectionError,
    letter_as_text,
    write_letter,
)
from app.services.reflection_input import build_reflection_context
from app.services.reports import (
    build_emotion_report,
    custom_range_error,
    custom_range_period,
    list_entries_on_date,
    list_report_entries,
    period_bounds,
    period_comparison,
    previous_custom_bounds,
    previous_period_bounds,
    subtract_one_month,
    subtract_one_year,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])

SENT_TO_AI_NOTE = "이 편지를 쓰기 위해 이 기간의 일기 일부와 감정 기록을 AI에 전달했어요. MOZI는 편지를 따로 저장하지 않아요."
PRIVACY_NOTES = {
    "openai": SENT_TO_AI_NOTE,
    "fallback": SENT_TO_AI_NOTE,
    "safety": "이 안내는 일기를 AI에 보내지 않고 MOZI가 직접 보여드린 내용이에요.",
}


def get_reflection_generator() -> OpenAIReflectionGenerator:
    settings = get_settings()
    return OpenAIReflectionGenerator(settings.openai_api_key, settings.openai_model)


ReflectionGenerator = Annotated[
    OpenAIReflectionGenerator, Depends(get_reflection_generator)
]


def resolve_report(
    db: DatabaseSession,
    user: CurrentUser,
    period: ReportPeriod,
    anchor: date,
    start_date: date | None = None,
    end_date: date | None = None,
) -> EmotionReportResponse:
    if (start_date is None) != (end_date is None):
        raise HTTPException(status_code=422, detail="시작일과 종료일을 함께 선택해 주세요.")
    custom = start_date is not None and end_date is not None
    if custom:
        problem = custom_range_error(start_date, end_date)
        if problem:
            raise HTTPException(status_code=422, detail=problem)
        period = custom_range_period(start_date, end_date)
        before_start, before_end = previous_custom_bounds(start_date, end_date)
    else:
        start_date, end_date = period_bounds(period, anchor)
        before_start, before_end = previous_period_bounds(period, start_date)
    return build_emotion_report(
        list_report_entries(db, user, start_date, end_date),
        period,
        start_date,
        end_date,
        period_comparison(list_report_entries(db, user, before_start, before_end), before_start, before_end),
        custom,
    )


@router.get("/emotions", response_model=EmotionReportResponse)
def get_emotion_report(
    user: CurrentUser,
    db: DatabaseSession,
    period: ReportPeriod = ReportPeriod.MONTH,
    anchor: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> EmotionReportResponse:
    return resolve_report(db, user, period, anchor or today_in_seoul(), start_date, end_date)


@router.post("/reflection", response_model=ReflectionResponse)
def generate_reflection(
    generator: ReflectionGenerator,
    user: CurrentUser,
    db: DatabaseSession,
    period: ReportPeriod = ReportPeriod.MONTH,
    anchor: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> ReflectionResponse:
    report = resolve_report(db, user, period, anchor or today_in_seoul(), start_date, end_date)
    if report.diary_count == 0:
        raise HTTPException(status_code=422, detail="회고를 만들 기록이 없습니다.")
    entries = list_report_entries(db, user, report.start_date, report.end_date)
    context = build_reflection_context(report, entries)
    try:
        result = write_letter(generator, context)
    except ReflectionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ReflectionResponse(
        period=report.period,
        start_date=report.start_date,
        end_date=report.end_date,
        reflection=letter_as_text(result.letter),
        letter=result.letter,
        safety=result.safety,
        provider=result.provider,
        model_name=result.model_name,
        privacy_note=PRIVACY_NOTES[result.provider],
    )


def past_moment(
    db: DatabaseSession,
    user: CurrentUser,
    label: str,
    target_date: date,
) -> PastMoment:
    entries = list_entries_on_date(db, user, target_date)
    records: list[PastEntry] = []
    for entry in entries:
        if entry.analysis is None:
            continue
        character = None
        if entry.encounter is not None:
            character = encounter_to_response(
                entry.encounter, entry.analysis.primary_emotion
            )
        records.append(
            PastEntry(
                entry_id=entry.id,
                entry_date=entry.entry_date,
                title=entry.title,
                diary_text=entry.diary_text or "",
                primary_emotion=entry.analysis.primary_emotion,
                character=character,
            )
        )
    return PastMoment(label=label, target_date=target_date, entries=records)


@router.get("/on-this-day", response_model=OnThisDayResponse)
def get_on_this_day(
    user: CurrentUser,
    db: DatabaseSession,
    anchor: Annotated[date | None, Query()] = None,
) -> OnThisDayResponse:
    resolved = anchor or today_in_seoul()
    month_date = subtract_one_month(resolved)
    year_date = subtract_one_year(resolved)
    return OnThisDayResponse(
        anchor_date=resolved,
        one_month_ago=past_moment(db, user, "한 달 전의 오늘", month_date),
        one_year_ago=past_moment(db, user, "일 년 전의 오늘", year_date),
    )
