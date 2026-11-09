from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DailyEntry, DailyEntryStatus, EmotionAnalysis, Encounter
from app.schemas.emotions import (
    DetailStateResult,
    DisplayEmotion,
    EmotionAnalysisPayload,
    EmotionAnalysisResponse,
    KeywordResult,
)
from app.services.emotion_display import build_display_emotions
from app.services.character_generator import create_character_encounter


def save_analysis(
    db: Session,
    entry: DailyEntry,
    payload: EmotionAnalysisPayload,
    analysis_mode: str,
    *,
    commit: bool = True,
    provider: str | None = None,
    model_name: str | None = None,
    prompt_version: str | None = None,
) -> EmotionAnalysis:
    display_emotions = build_display_emotions(payload)
    analysis = EmotionAnalysis(
        daily_entry_id=entry.id,
        schema_version=payload.schema_version,
        base_emotions=payload.base_emotions.model_dump(),
        primary_emotion=payload.primary_emotion.value,
        secondary_emotions=[key.value for key in payload.secondary_emotions],
        primary_ratio=payload.primary_ratio,
        secondary_ratio=payload.secondary_ratio,
        detail_states=[state.model_dump(mode="json") for state in payload.detail_states],
        energy=payload.energy,
        keywords=[keyword.model_dump(mode="json") for keyword in payload.keywords],
        event_summary=payload.event_summary,
        reason=payload.reason,
        events=payload.events,
        objects=payload.objects,
        confidence=payload.confidence,
        uncertainty_note=payload.uncertainty_note,
        display_emotions=[emotion.model_dump(mode="json") for emotion in display_emotions],
        analysis_mode=analysis_mode,
        provider=provider or ("openai" if analysis_mode == "live" else "demo_rules"),
        model_name=model_name,
        prompt_version=prompt_version,
    )
    entry.status = DailyEntryStatus.COMPLETED.value
    entry.analysis_mode = analysis_mode
    db.add(analysis)
    db.flush()
    create_character_encounter(db, entry, payload)
    if commit:
        db.commit()
        db.refresh(analysis)
    return analysis


def replace_demo_analysis(
    db: Session,
    entry: DailyEntry,
    payload: EmotionAnalysisPayload,
    *,
    model_name: str | None = None,
    prompt_version: str | None = None,
) -> EmotionAnalysis:
    """Replace a saved demo result only after a live payload is available."""
    if entry.analysis is None or entry.analysis.analysis_mode != "demo":
        raise ValueError("데모 분석만 실제 AI 분석으로 교체할 수 있습니다.")

    old_encounter = entry.encounter
    old_character = old_encounter.character if old_encounter else None
    old_was_resident = bool(old_character and old_character.is_resident)
    old_encounter_count = 0
    if old_character is not None:
        old_encounter_count = db.scalar(
            select(func.count()).select_from(Encounter).where(
                Encounter.character_id == old_character.id
            )
        ) or 0

    if old_encounter is not None:
        db.delete(old_encounter)
    db.delete(entry.analysis)
    db.flush()

    analysis = save_analysis(
        db,
        entry,
        payload,
        analysis_mode="live",
        commit=False,
        provider="openai",
        model_name=model_name,
        prompt_version=prompt_version,
    )
    new_encounter = db.scalar(
        select(Encounter).where(Encounter.daily_entry_id == entry.id)
    )
    if new_encounter is None:
        raise RuntimeError("실제 AI 분석 캐릭터를 생성하지 못했습니다.")

    new_character = new_encounter.character
    if old_was_resident:
        new_character.is_resident = True

    if (
        old_character is not None
        and old_encounter_count == 1
        and old_character.id != new_character.id
    ):
        db.delete(old_character)

    db.commit()
    db.refresh(analysis)
    return analysis


def mark_analysis_failed(db: Session, entry: DailyEntry) -> None:
    entry.status = DailyEntryStatus.AI_FAILED.value
    entry.analysis_mode = None
    db.commit()


def analysis_to_response(analysis: EmotionAnalysis) -> EmotionAnalysisResponse:
    scores = analysis.base_emotions
    if analysis.review:
        # Palette adapter scores are renderer inputs, never measured emotion data.
        scores = {}
    secondary = analysis.secondary_emotions[:1]
    primary_ratio = analysis.primary_ratio
    secondary_ratio = analysis.secondary_ratio
    if analysis.schema_version < 3 and (primary_ratio is None or secondary_ratio is None):
        display = analysis.display_emotions
        primary_ratio = display[0].get("percentage", 100) if display else 100
        secondary_ratio = (
            display[1].get("percentage", 0) if len(display) > 1 else 0
        )
    return EmotionAnalysisResponse(
        schema_version=analysis.schema_version,
        base_emotions=scores,
        primary_emotion=analysis.primary_emotion,
        secondary_emotions=secondary,
        primary_ratio=primary_ratio,
        secondary_ratio=secondary_ratio,
        primary_intensity=(
            next((item["intensity"] for item in analysis.review["emotions"] if item["emotion"] == analysis.primary_emotion), 0)
            if analysis.review else scores.get(analysis.primary_emotion, 0)
        ),
        secondary_intensity=(
            next((item["intensity"] for item in analysis.review["emotions"] if item["emotion"] == secondary[0]), 0)
            if analysis.review and secondary else (scores.get(secondary[0], 0) if secondary else 0)
        ),
        detail_states=[DetailStateResult.model_validate(v) for v in analysis.detail_states],
        energy=analysis.energy,
        keywords=[KeywordResult.model_validate(v) for v in analysis.keywords],
        event_summary=analysis.event_summary,
        reason=analysis.reason or analysis.event_summary,
        events=analysis.events or [],
        objects=analysis.objects or [],
        confidence=analysis.confidence if analysis.confidence is not None else 50,
        uncertainty_note=analysis.uncertainty_note,
        display_emotions=[DisplayEmotion.model_validate(v) for v in analysis.display_emotions],
        analysis_mode=analysis.analysis_mode,
        provider=analysis.provider,
        model_name=analysis.model_name,
        prompt_version=analysis.prompt_version,
        is_user_edited=analysis.is_user_edited,
        review=analysis.review,
        review_revision=analysis.review_revision,
        ai_original=analysis.ai_original,
    )
