"""Evidence persistence and atomic, owner-scoped review/confirmation transitions."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import or_, select, update

from app.constants.emotions import EMOTION_LABELS
from app.models import DailyEntry, EmotionAnalysis
from app.schemas.emotion_review import (
    EvidenceAnalysisPayload, EmotionReview, ReviewedEmotion,
)


def claim_analysis(db, entry):
    token = str(uuid4())
    now = datetime.now(timezone.utc)
    claimed = db.execute(update(DailyEntry).where(
        DailyEntry.id == entry.id,
        DailyEntry.status.in_(["analyzing", "ai_failed"]),
        or_(DailyEntry.analysis_token.is_(None), DailyEntry.analysis_started_at < now - timedelta(seconds=120)),
    ).values(status="analyzing", analysis_token=token, analysis_started_at=now))
    db.commit()
    return token if claimed.rowcount else None


def finish_analysis(db, entry, token, payload, *, mode, model=None, prompt=None):
    # A stale request, deleted diary, or a newer lease can never overwrite a result.
    state = "ai_failed" if payload is None else (
        "awaiting_confirmation" if payload.status == "analyzed" else "uncertain"
    )
    claimed = db.execute(update(DailyEntry).where(
        DailyEntry.id == entry.id, DailyEntry.analysis_token == token,
        DailyEntry.status == "analyzing",
    ).values(status=state, analysis_token=None, analysis_started_at=None))
    if not claimed.rowcount:
        db.rollback()
        db.expire_all()
        return
    if payload is not None:
        payload = EvidenceAnalysisPayload.model_validate(payload).verify_source(entry.diary_text or "")
        emotions = []
        for item in payload.emotions:
            start = entry.diary_text.index(item.evidence)
            emotions.append(ReviewedEmotion(
                **item.model_dump(), source="ai", evidence_start=start,
                evidence_end=start + len(item.evidence),
            ))
        review = EmotionReview(
            status=payload.status, emotions=emotions, relationship=payload.relationship,
            recommended_emotion=payload.recommended_emotion,
            selected_emotion=payload.recommended_emotion, objects=payload.objects,
        )
        analysis = EmotionAnalysis(
            daily_entry_id=entry.id, schema_version=3,
            ai_original=review.model_dump(mode="json"), review=review.model_dump(mode="json"), review_revision=1,
            base_emotions={}, primary_emotion=None, secondary_emotions=[],
            primary_ratio=None, secondary_ratio=None, detail_states=[], energy=50, keywords=[],
            event_summary=payload.relationship.explanation, reason=payload.relationship.explanation,
            events=[item.event for item in emotions if item.event], objects=payload.objects,
            display_emotions=[], analysis_mode=mode, provider="openai" if mode == "live" else "demo_rules",
            model_name=model, prompt_version=prompt,
            uncertainty_note=payload.relationship.explanation if payload.status == "uncertain" else None,
        )
        db.add(analysis)
        entry.analysis_mode = mode
    db.commit()
    db.expire_all()


def lock_review(db, entry, revision):
    # Serialize with delete/confirm first, then compare-and-swap the revision.
    changed = db.execute(update(DailyEntry).where(
        DailyEntry.id == entry.id, DailyEntry.status == "awaiting_confirmation",
    ).values(updated_at=datetime.now(timezone.utc)))
    if not changed.rowcount:
        db.rollback()
        raise HTTPException(409, "캐릭터 생성 전의 감정만 수정할 수 있어요.")
    analysis = db.scalar(select(EmotionAnalysis).where(EmotionAnalysis.daily_entry_id == entry.id))
    if analysis is None or not analysis.review:
        db.rollback()
        raise HTTPException(409, "확인할 분석 결과가 없어요.")
    changed = db.execute(update(EmotionAnalysis).where(
        EmotionAnalysis.id == analysis.id, EmotionAnalysis.review_revision == revision,
    ).values(review_revision=revision + 1))
    if not changed.rowcount:
        db.rollback()
        raise HTTPException(409, "다른 요청에서 결과가 변경됐어요. 새로고침 후 확인해 주세요.")
    db.refresh(analysis)
    return analysis


def confirm_review(db, entry, payload, *, confirmed_by_user=True):
    # Idempotent retry after a successful response was lost.
    db.refresh(entry)
    if entry.status == "completed" and entry.analysis and entry.analysis.review:
        return
    analysis = lock_review(db, entry, payload.revision)
    review = EmotionReview.model_validate(analysis.review)
    if payload.selected_emotion not in [item.emotion for item in review.emotions]:
        db.rollback()
        raise HTTPException(422, "분석 결과에서 대표 감정을 선택해 주세요.")
    review.selected_emotion = payload.selected_emotion
    review.confirmed_by_user = confirmed_by_user
    review = EmotionReview.model_validate(review.model_dump())
    from app.services.character_generator import create_character_encounter
    from app.schemas.emotions import BaseEmotionKey, EmotionAnalysisPayload
    # Adapter scores are renderer coordinates, never measured intensities or ratios.
    levels = {1: 10, 2: 30, 3: 50, 4: 70, 5: 90}
    scores = {key.value: 0 for key in BaseEmotionKey}
    for item in review.emotions:
        scores[item.emotion.value] = levels[item.intensity]
    selected = review.selected_emotion
    other = [item for item in review.emotions if item.emotion != selected]
    legacy_adapter = EmotionAnalysisPayload(
        primary_emotion=selected, base_emotions=scores,
        secondary_emotions=[item.emotion for item in other],
        detail_states=[], energy=50, keywords=[], objects=review.objects,
        event_summary=review.relationship.explanation[:200],
    )
    create_character_encounter(db, entry, legacy_adapter, review=review)
    analysis.review = review.model_dump(mode="json")
    analysis.primary_emotion = selected.value
    analysis.secondary_emotions = [item.emotion.value for item in other]
    analysis.base_emotions = {}  # Palette adapter values never enter persisted analysis.
    analysis.reason = review.relationship.explanation
    analysis.display_emotions = [
        {"key": item.emotion.value, "label": EMOTION_LABELS[item.emotion], "intensity": item.intensity}
        for item in review.emotions
    ]
    analysis.is_user_edited = analysis.is_user_edited or (confirmed_by_user and selected != review.recommended_emotion)
    if analysis.is_user_edited:
        analysis.user_override = analysis.review
    entry.status = "completed"
    db.commit()
    db.expire_all()


def create_recommended_character(db, entry):
    """Automatically materialize an analyzed result; uncertain analyses stay character-free."""
    db.refresh(entry)
    if entry.status != "awaiting_confirmation" or entry.analysis is None or not entry.analysis.review:
        return
    review = EmotionReview.model_validate(entry.analysis.review)
    if review.status != "analyzed" or review.recommended_emotion is None:
        return
    from types import SimpleNamespace

    confirm_review(
        db,
        entry,
        SimpleNamespace(revision=entry.analysis.review_revision, selected_emotion=review.recommended_emotion),
        confirmed_by_user=False,
    )
