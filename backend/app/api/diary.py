from calendar import monthrange
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.models import DailyEntry, DailyEntryStatus
from app.schemas.diary import (
    DiaryCalendarRecord,
    DiaryCalendarResponse,
    DiaryCreateRequest,
    DiaryTodayResponse,
)
from app.services.clock import today_in_seoul
from app.services.character_generator import encounter_to_response
from app.services.demo_analysis import analyze_with_demo_rules
from app.services.diary import create_daily_entry, find_entry_for_date, list_entries_for_range
from app.services.emotion_analysis import (
    analysis_to_response,
    mark_analysis_failed,
    replace_demo_analysis,
    save_analysis,
)
from app.services.openai_analysis import EmotionAnalysisError, OpenAIEmotionAnalyzer

router = APIRouter(prefix="/api/diary", tags=["diary"])


def get_live_analyzer() -> OpenAIEmotionAnalyzer:
    settings = get_settings()
    return OpenAIEmotionAnalyzer(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
    )


LiveAnalyzer = Annotated[OpenAIEmotionAnalyzer, Depends(get_live_analyzer)]


def to_today_response(entry: DailyEntry | None) -> DiaryTodayResponse:
    entry_date = today_in_seoul()
    if entry is None:
        return DiaryTodayResponse(status="not_started", entry_date=entry_date)
    return DiaryTodayResponse(
        status=entry.status,
        entry_date=entry.entry_date,
        entry_id=entry.id,
        title=None if entry.status == "deleted" else entry.title,
        diary_text=None if entry.status == "deleted" else entry.diary_text,
        analysis=analysis_to_response(entry.analysis) if entry.analysis else None,
        character=(
            encounter_to_response(entry.encounter, entry.analysis.primary_emotion)
            if entry.encounter and entry.analysis
            else None
        ),
    )


def run_live_analysis(
    db: DatabaseSession,
    entry: DailyEntry,
    analyzer: OpenAIEmotionAnalyzer,
) -> None:
    if entry.analysis is not None:
        return
    entry.status = DailyEntryStatus.ANALYZING.value
    db.commit()
    try:
        payload = analyzer.analyze(entry.diary_text or "")
    except EmotionAnalysisError:
        mark_analysis_failed(db, entry)
        return
    save_analysis(db, entry, payload, analysis_mode="live")


@router.get("/today", response_model=DiaryTodayResponse)
def get_today_entry(user: CurrentUser, db: DatabaseSession) -> DiaryTodayResponse:
    entry = find_entry_for_date(db, user, today_in_seoul())
    return to_today_response(entry)


@router.get("/records", response_model=DiaryCalendarResponse)
def get_monthly_records(
    user: CurrentUser,
    db: DatabaseSession,
    year: Annotated[int, Query(ge=2000, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> DiaryCalendarResponse:
    start_date = date(year, month, 1)
    end_date = date(year, month, monthrange(year, month)[1])
    entries = list_entries_for_range(db, user, start_date, end_date)
    records = []
    for entry in entries:
        if entry.encounter is None or entry.analysis is None:
            continue
        records.append(
            DiaryCalendarRecord(
                entry_id=entry.id,
                entry_date=entry.entry_date,
                title=entry.title,
                character=encounter_to_response(
                    entry.encounter, entry.analysis.primary_emotion
                ),
            )
        )
    return DiaryCalendarResponse(year=year, month=month, records=records)


@router.post(
    "/today",
    response_model=DiaryTodayResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_today_entry(
    payload: DiaryCreateRequest,
    response: Response,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    entry_date = today_in_seoul()
    existing = find_entry_for_date(db, user, entry_date)
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return to_today_response(existing)

    try:
        entry = create_daily_entry(
            db, user, entry_date, payload.diary_text, payload.title
        )
    except IntegrityError:
        db.rollback()
        existing = find_entry_for_date(db, user, entry_date)
        if existing is None:
            raise
        response.status_code = status.HTTP_200_OK
        return to_today_response(existing)

    run_live_analysis(db, entry, analyzer)
    db.refresh(entry)
    return to_today_response(entry)


def get_retryable_entry(user: CurrentUser, db: DatabaseSession) -> DailyEntry:
    entry = find_entry_for_date(db, user, today_in_seoul())
    if entry is None:
        raise HTTPException(status_code=404, detail="오늘 작성한 일기가 없습니다.")
    if entry.status == DailyEntryStatus.DELETED.value:
        raise HTTPException(status_code=409, detail="삭제한 오늘의 기록은 다시 분석할 수 없습니다.")
    return entry


@router.post("/today/retry", response_model=DiaryTodayResponse)
def retry_today_analysis(
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    entry = get_retryable_entry(user, db)
    if entry.analysis is not None and entry.analysis.analysis_mode == "demo":
        try:
            payload = analyzer.analyze(entry.diary_text or "")
        except EmotionAnalysisError as exc:
            raise HTTPException(
                status_code=502,
                detail="실제 AI 분석에 다시 실패했습니다. 기존 데모 결과는 보존되었습니다.",
            ) from exc
        replace_demo_analysis(db, entry, payload)
        db.refresh(entry)
    elif entry.analysis is None:
        run_live_analysis(db, entry, analyzer)
        db.refresh(entry)
    return to_today_response(entry)


@router.post("/today/demo", response_model=DiaryTodayResponse)
def continue_with_demo_analysis(
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    entry = get_retryable_entry(user, db)
    if entry.analysis is None:
        payload = analyze_with_demo_rules(entry.diary_text or "")
        save_analysis(db, entry, payload, analysis_mode="demo")
        db.refresh(entry)
    return to_today_response(entry)
