from calendar import monthrange
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.models import DailyEntry, DailyEntryStatus, DiaryPhoto
from app.schemas.diary import (
    DiaryCalendarRecord,
    DiaryCalendarResponse,
    DiaryCreateRequest,
    DiaryDraftRequest,
    DiaryEntryCreateRequest,
    DiarySearchRecord,
    DiarySearchResponse,
    DiaryTodayResponse,
    DiaryUpdateRequest,
)
from app.schemas.emotions import (
    BaseEmotionKey,
    DetailStateResult,
    EmotionAnalysisPayload,
    EmotionAnalysisUpdateRequest,
    KeywordResult,
)
from app.services.clock import today_in_seoul
from app.services.character_generator import create_character_encounter, encounter_to_response
from app.services.evidence_demo import analyze_evidence_demo
from app.services.emotion_review import claim_analysis, finish_analysis, create_recommended_character
from app.schemas.emotion_review import EvidenceAnalysisPayload
from app.services.characters import (
    clear_entry_character,
    clear_entry_generation,
    delete_encounter,
)
from app.services.emotion_display import build_display_emotions
from app.services.diary import (
    create_daily_entry,
    find_entry_for_date,
    find_owned_entry,
    list_entries_for_range,
    save_draft,
    search_entries,
)
from app.services.emotion_analysis import (
    analysis_to_response,
    mark_analysis_failed,
    replace_demo_analysis,
    save_analysis,
)
from app.services.openai_analysis import (
    PROMPT_VERSION,
    EmotionAnalysisError,
    OpenAIEmotionAnalyzer,
)
from app.services.media import MAX_DIARY_IMAGE_BYTES, MediaValidationError, delete_media, media_path, store_image

router = APIRouter(prefix="/api/diary", tags=["diary"])


def get_live_analyzer() -> OpenAIEmotionAnalyzer:
    settings = get_settings()
    return OpenAIEmotionAnalyzer(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
    )


LiveAnalyzer = Annotated[OpenAIEmotionAnalyzer, Depends(get_live_analyzer)]


def to_today_response(
    entry: DailyEntry | None, requested_date: date | None = None, *, analysis_error: str | None = None
) -> DiaryTodayResponse:
    entry_date = requested_date or today_in_seoul()
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
        photo_url=(f"/api/diary/entries/{entry.id}/photo" if entry.photo else None),
        analysis_error=analysis_error,
    )


def run_live_analysis(
    db: DatabaseSession,
    entry: DailyEntry,
    analyzer: OpenAIEmotionAnalyzer,
) -> str | None:
    if entry.analysis is not None:
        return None
    token = claim_analysis(db, entry)
    if token is None:
        db.refresh(entry)
        return None
    analysis_error = None
    try:
        payload = EvidenceAnalysisPayload.model_validate(analyzer.analyze(entry.diary_text or "")).verify_source(entry.diary_text or "")
    except EmotionAnalysisError as exc:
        analysis_error = str(exc)
        payload = None
    except ValueError:
        analysis_error = "AI 분석 결과를 확인하지 못했습니다. 다시 시도해 주세요."
        payload = None
    finish_analysis(db, entry, token, payload, mode="live",
        model=getattr(analyzer, "model", None), prompt=PROMPT_VERSION)
    if payload is not None:
        create_recommended_character(db, entry)
    return analysis_error


def run_demo_analysis(db, entry):
    if entry.analysis is not None:
        return
    token = claim_analysis(db, entry)
    if token:
        finish_analysis(db, entry, token, analyze_evidence_demo(entry.diary_text or ""), mode="demo", prompt="demo-evidence-v3")
        create_recommended_character(db, entry)


@router.get("/today", response_model=DiaryTodayResponse)
def get_today_entry(user: CurrentUser, db: DatabaseSession) -> DiaryTodayResponse:
    entry = find_entry_for_date(db, user, today_in_seoul())
    if entry is not None and entry.status == DailyEntryStatus.AWAITING_CONFIRMATION.value:
        create_recommended_character(db, entry)
    return to_today_response(entry)


def validate_entry_date(entry_date: date) -> None:
    if entry_date > today_in_seoul():
        raise HTTPException(status_code=422, detail="미래 날짜에는 일기를 작성할 수 없습니다.")


def require_writable_date(entry_date: date) -> None:
    """A diary is written once a day, on that day: no future and no past dates."""
    validate_entry_date(entry_date)
    if entry_date != today_in_seoul():
        raise HTTPException(status_code=422, detail="일기는 오늘 날짜에만 쓸 수 있어요.")


def require_owned_entry(
    entry_id: str, user: CurrentUser, db: DatabaseSession
) -> DailyEntry:
    entry = find_owned_entry(db, user, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    return entry


@router.get("/by-date", response_model=DiaryTodayResponse)
def get_entry_by_date(
    entry_date: date,
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    validate_entry_date(entry_date)
    entry = find_entry_for_date(db, user, entry_date)
    if entry is not None and entry.status == DailyEntryStatus.AWAITING_CONFIRMATION.value:
        create_recommended_character(db, entry)
    return to_today_response(entry, entry_date)


@router.get("/entries/{entry_id}", response_model=DiaryTodayResponse)
def get_entry(
    entry_id: str, user: CurrentUser, db: DatabaseSession
) -> DiaryTodayResponse:
    entry = require_owned_entry(entry_id, user, db)
    if entry.status == DailyEntryStatus.AWAITING_CONFIRMATION.value:
        create_recommended_character(db, entry)
    return to_today_response(entry)


@router.put("/entries/{entry_id}/photo", response_model=DiaryTodayResponse)
async def upload_entry_photo(
    entry_id: str,
    request: Request,
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    entry = require_owned_entry(entry_id, user, db)
    if entry.status == DailyEntryStatus.DELETED.value:
        raise HTTPException(status_code=409, detail="삭제된 일기에는 사진을 첨부할 수 없어요.")
    data = await request.body()
    try:
        stored_name, content_type = store_image("diary", data, request.headers.get("content-type", ""), MAX_DIARY_IMAGE_BYTES)
    except MediaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    previous = entry.photo.stored_name if entry.photo else None
    if entry.photo is None:
        entry.photo = DiaryPhoto(daily_entry_id=entry.id, stored_name=stored_name, content_type=content_type, size_bytes=len(data))
    else:
        entry.photo.stored_name = stored_name
        entry.photo.content_type = content_type
        entry.photo.size_bytes = len(data)
    db.commit()
    delete_media("diary", previous)
    return to_today_response(entry)


@router.get("/entries/{entry_id}/photo")
def get_entry_photo(
    entry_id: str, user: CurrentUser, db: DatabaseSession
) -> FileResponse:
    entry = require_owned_entry(entry_id, user, db)
    path = media_path("diary", entry.photo.stored_name if entry.photo else "")
    if path is None:
        raise HTTPException(status_code=404, detail="첨부 사진이 없어요.")
    return FileResponse(path, media_type=entry.photo.content_type, headers={"Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff"})


@router.delete("/entries/{entry_id}/photo", response_model=DiaryTodayResponse)
def remove_entry_photo(
    entry_id: str, user: CurrentUser, db: DatabaseSession
) -> DiaryTodayResponse:
    entry = require_owned_entry(entry_id, user, db)
    if entry.photo is None:
        return to_today_response(entry)
    previous = entry.photo.stored_name
    db.delete(entry.photo)
    entry.photo = None
    db.commit()
    delete_media("diary", previous)
    return to_today_response(entry)


@router.get("/search", response_model=DiarySearchResponse)
def search_diary_entries(
    user: CurrentUser,
    db: DatabaseSession,
    query: Annotated[str, Query(max_length=100)] = "",
    date_from: date | None = None,
    date_to: date | None = None,
    emotion: BaseEmotionKey | None = None,
) -> DiarySearchResponse:
    normalized = query.strip()
    if not normalized and date_from is None and date_to is None and emotion is None:
        raise HTTPException(status_code=422, detail="검색어나 필터를 하나 이상 선택해 주세요.")
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="시작 날짜는 종료 날짜보다 늦을 수 없습니다.")
    entries = search_entries(
        db,
        user,
        normalized,
        date_from=date_from,
        date_to=date_to,
        emotion=emotion.value if emotion else None,
    )
    return DiarySearchResponse(
        query=normalized,
        records=[
            DiarySearchRecord(
                entry_id=entry.id,
                entry_date=entry.entry_date,
                title=entry.title,
                diary_preview=(entry.diary_text or "")[:120],
                status=entry.status,
                character_id=(
                    entry.encounter.character_id if entry.encounter is not None else None
                ),
                encounter_id=entry.encounter.id if entry.encounter is not None else None,
                primary_emotion=(entry.analysis.primary_emotion if entry.analysis else None),
            )
            for entry in entries
        ],
    )


@router.put("/draft", response_model=DiaryTodayResponse)
def save_diary_draft(
    payload: DiaryDraftRequest,
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    require_writable_date(payload.entry_date)
    existing = find_entry_for_date(db, user, payload.entry_date)
    if existing is not None and existing.status != DailyEntryStatus.DRAFT.value:
        raise HTTPException(status_code=409, detail="이미 확정된 날짜의 일기입니다.")
    entry = save_draft(
        db, user, payload.entry_date, payload.diary_text, payload.title
    )
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
        records.append(
            DiaryCalendarRecord(
                entry_id=entry.id,
                entry_date=entry.entry_date,
                title=entry.title,
                status=entry.status,
                character=encounter_to_response(
                    entry.encounter, entry.analysis.primary_emotion
                ) if entry.encounter and entry.analysis else None,
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
    return create_entry_for_date(
        DiaryEntryCreateRequest(
            entry_date=entry_date,
            diary_text=payload.diary_text,
            title=payload.title,
        ),
        response,
        user,
        db,
        analyzer,
    )


@router.post("/today/demo-rewrite", response_model=DiaryTodayResponse)
def rewrite_demo_today_entry(
    payload: DiaryCreateRequest,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    """Replace today's diary only for the configured presentation account."""
    settings = get_settings()
    if user.email.casefold() != settings.demo_account_email.strip().casefold():
        raise HTTPException(status_code=403, detail="데모 계정에서만 오늘 기록을 다시 작성할 수 있어요.")

    entry_date = today_in_seoul()
    entry = find_entry_for_date(db, user, entry_date)
    old_photo = entry.photo.stored_name if entry is not None and entry.photo is not None else None
    if entry is None:
        entry = create_daily_entry(db, user, entry_date, payload.diary_text, payload.title)
    else:
        if entry.status != DailyEntryStatus.DELETED.value:
            clear_entry_generation(db, entry)
        if entry.photo is not None:
            db.delete(entry.photo)
            entry.photo = None
        entry.title = payload.title
        entry.diary_text = payload.diary_text
        entry.status = DailyEntryStatus.ANALYZING.value
        entry.analysis_mode = None
        entry.analysis_token = None
        entry.analysis_started_at = None
        entry.deleted_at = None
        db.commit()

    delete_media("diary", old_photo)
    analysis_error = run_live_analysis(db, entry, analyzer)
    db.refresh(entry)
    return to_today_response(entry, analysis_error=analysis_error)


def create_entry_for_date(
    payload: DiaryEntryCreateRequest,
    response: Response,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: OpenAIEmotionAnalyzer,
) -> DiaryTodayResponse:
    entry_date = payload.entry_date
    require_writable_date(entry_date)
    existing = find_entry_for_date(db, user, entry_date)
    if existing is not None:
        if existing.status != DailyEntryStatus.DRAFT.value:
            response.status_code = status.HTTP_200_OK
            return to_today_response(existing)
        existing.title = payload.title
        existing.diary_text = payload.diary_text
        existing.status = DailyEntryStatus.ANALYZING.value
        db.commit()
        entry = existing
    else:
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

    analysis_error = run_live_analysis(db, entry, analyzer)
    db.refresh(entry)
    return to_today_response(entry, analysis_error=analysis_error)


@router.post(
    "/entries", response_model=DiaryTodayResponse, status_code=status.HTTP_201_CREATED
)
def create_dated_entry(
    payload: DiaryEntryCreateRequest,
    response: Response,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    return create_entry_for_date(payload, response, user, db, analyzer)


@router.patch("/entries/{entry_id}", response_model=DiaryTodayResponse)
def update_entry(
    entry_id: str,
    payload: DiaryUpdateRequest,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    """Written diaries are final: the text can't be rewritten after submission."""
    require_owned_entry(entry_id, user, db)
    raise HTTPException(status_code=409, detail="작성한 일기는 수정할 수 없어요.")


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: str, user: CurrentUser, db: DatabaseSession
) -> Response:
    entry = require_owned_entry(entry_id, user, db)
    photo_file = entry.photo.stored_name if entry.photo else None
    if entry.status == DailyEntryStatus.DRAFT.value:
        db.delete(entry)
        db.commit()
        delete_media("diary", photo_file)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if entry.status == DailyEntryStatus.DELETED.value:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if entry.photo is not None:
        db.delete(entry.photo)
        entry.photo = None
    if entry.encounter is not None:
        delete_encounter(db, entry.encounter)
    else:
        if entry.analysis is not None:
            db.delete(entry.analysis)
        entry.title = None
        entry.diary_text = None
        entry.status = DailyEntryStatus.DELETED.value
        entry.analysis_mode = None
        entry.deleted_at = datetime.now(timezone.utc)
        db.commit()
    delete_media("diary", photo_file)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/entries/{entry_id}/analysis", response_model=DiaryTodayResponse)
def update_entry_analysis(
    entry_id: str,
    payload: EmotionAnalysisUpdateRequest,
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    require_owned_entry(entry_id, user, db)
    raise HTTPException(409, "생성된 캐릭터의 감정은 변경할 수 없어요. 새 기록은 생성 전에 확인해 주세요.")


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
    if entry.status == DailyEntryStatus.AWAITING_CONFIRMATION.value:
        create_recommended_character(db, entry)
        db.refresh(entry)
        analysis_error = None
    elif entry.analysis is None:
        analysis_error = run_live_analysis(db, entry, analyzer)
        db.refresh(entry)
    else:
        analysis_error = None
    return to_today_response(entry, analysis_error=analysis_error)


@router.post("/today/demo", response_model=DiaryTodayResponse)
def continue_with_demo_analysis(
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    entry = get_retryable_entry(user, db)
    if entry.analysis is None:
        run_demo_analysis(db, entry)
        db.refresh(entry)
    return to_today_response(entry)


@router.post("/entries/{entry_id}/retry", response_model=DiaryTodayResponse)
def retry_entry_analysis(
    entry_id: str,
    user: CurrentUser,
    db: DatabaseSession,
    analyzer: LiveAnalyzer,
) -> DiaryTodayResponse:
    entry = require_owned_entry(entry_id, user, db)
    if entry.status in (DailyEntryStatus.DELETED.value, DailyEntryStatus.DRAFT.value):
        raise HTTPException(status_code=409, detail="이 일기는 분석할 수 없는 상태입니다.")
    if entry.status == DailyEntryStatus.AWAITING_CONFIRMATION.value:
        create_recommended_character(db, entry)
        analysis_error = None
    elif entry.analysis is None:
        analysis_error = run_live_analysis(db, entry, analyzer)
    else:
        analysis_error = None
    db.refresh(entry)
    return to_today_response(entry, analysis_error=analysis_error)


@router.post("/entries/{entry_id}/demo", response_model=DiaryTodayResponse)
def continue_entry_with_demo_analysis(
    entry_id: str,
    user: CurrentUser,
    db: DatabaseSession,
) -> DiaryTodayResponse:
    entry = require_owned_entry(entry_id, user, db)
    if entry.status in (DailyEntryStatus.DELETED.value, DailyEntryStatus.DRAFT.value):
        raise HTTPException(status_code=409, detail="이 일기는 분석할 수 없는 상태입니다.")
    if entry.analysis is None:
        run_demo_analysis(db, entry)
    db.refresh(entry)
    return to_today_response(entry)
