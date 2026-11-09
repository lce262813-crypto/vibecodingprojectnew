from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.constants.characters import PALETTE_COLORS
from app.models import Character, DailyEntry, DailyEntryStatus, Encounter, User
from app.schemas.characters import (
    CharacterAppearance,
    CharacterCard,
    CharacterDetail,
    EncounterDetail,
    EncounterSummary,
)
from app.schemas.emotions import BaseEmotionKey
from app.services.emotion_analysis import analysis_to_response
from app.services.media import delete_media
from app.services.character_generator import encounter_to_response
from app.services.items import item_for_encounter


def find_owned_character(db: Session, user: User, character_id: str) -> Character | None:
    return db.scalar(
        select(Character)
        .options(
            selectinload(Character.encounters)
            .selectinload(Encounter.daily_entry)
            .selectinload(DailyEntry.analysis)
        )
        .where(Character.id == character_id, Character.user_id == user.id)
    )


def appearance_for(character: Character, item: str | None = None) -> CharacterAppearance:
    return CharacterAppearance(
        body_part=character.body_part,
        palette=character.palette,
        color=PALETTE_COLORS[character.palette],
        eyebrow_part=character.eyebrow_part,
        eye_part=character.eye_part,
        mouth_part=character.mouth_part,
        mutation_part=character.mutation_part,
        renderer_version=character.algorithm_version,
        render_spec={**character.render_spec, "decoration_id": item} if character.render_spec else None,
    )


def card_for(character: Character) -> CharacterCard:
    encounters = sorted(character.encounters, key=lambda item: item.met_on)
    return CharacterCard(
        character_id=character.id,
        name=character.name,
        primary_emotion=primary_emotion_for_character(character),
        behavior_type=character.behavior_type,
        is_resident=character.is_resident,
        is_favorite=character.is_favorite,
        encounter_count=len(encounters),
        first_met_on=encounters[0].met_on,
        last_met_on=encounters[-1].met_on,
        appearance=appearance_for(character, item_for_encounter(encounters[-1])),
    )


def list_character_cards(db: Session, user: User) -> list[CharacterCard]:
    characters = db.scalars(
        select(Character)
        .options(
            selectinload(Character.encounters)
            .selectinload(Encounter.daily_entry)
            .selectinload(DailyEntry.analysis)
        )
        .where(Character.user_id == user.id)
    ).all()
    cards = [card_for(character) for character in characters if character.encounters]
    return sorted(cards, key=lambda card: card.last_met_on, reverse=True)


def detail_for(character: Character) -> CharacterDetail:
    encounters = sorted(character.encounters, key=lambda item: item.met_on, reverse=True)
    return CharacterDetail(
        character=card_for(character),
        encounters=[
            EncounterSummary(
                encounter_id=item.id,
                met_on=item.met_on,
                intensity_level=item.intensity_level,
                accessory_part=item_for_encounter(item),
                effect_parts=item.effect_parts,
                entry_id=item.daily_entry_id,
                title=item.daily_entry.title,
                primary_emotion=BaseEmotionKey(item.daily_entry.analysis.primary_emotion),
                secondary_emotions=[
                    BaseEmotionKey(value)
                    for value in item.daily_entry.analysis.secondary_emotions
                ],
                display_emotions=item.daily_entry.analysis.display_emotions,
            )
            for item in encounters
            if item.daily_entry.analysis is not None
        ],
    )


def primary_emotion_for_character(character: Character) -> BaseEmotionKey:
    parts = character.fingerprint.split(":")
    return BaseEmotionKey(
        parts[1] if parts[0] in {"pixel-v5", "human-v1", "human-review-v1"} else parts[0]
    )


def find_owned_encounter(
    db: Session, user: User, character_id: str, encounter_id: str
) -> Encounter | None:
    return db.scalar(
        select(Encounter)
        .join(Character)
        .options(
            selectinload(Encounter.daily_entry).selectinload(DailyEntry.analysis),
            selectinload(Encounter.character),
        )
        .where(
            Encounter.id == encounter_id,
            Encounter.character_id == character_id,
            Character.user_id == user.id,
        )
    )


def encounter_detail_for(encounter: Encounter) -> EncounterDetail:
    entry = encounter.daily_entry
    if entry.analysis is None or entry.diary_text is None:
        raise ValueError("삭제된 만남은 조회할 수 없습니다.")
    return EncounterDetail(
        encounter_id=encounter.id,
        met_on=encounter.met_on,
        title=entry.title,
        diary_text=entry.diary_text,
        analysis=analysis_to_response(entry.analysis),
        character=encounter_to_response(
            encounter,
            entry.analysis.primary_emotion,
            is_new_character=False,
        ),
    )


def delete_encounter(db: Session, encounter: Encounter) -> bool:
    character = encounter.character
    entry = encounter.daily_entry
    photo_file = entry.photo.stored_name if entry.photo is not None else None
    encounter_count = db.scalar(
        select(func.count()).select_from(Encounter).where(
            Encounter.character_id == character.id
        )
    ) or 0

    if entry.analysis is not None:
        db.delete(entry.analysis)
    if entry.photo is not None:
        db.delete(entry.photo)
        entry.photo = None
    db.delete(encounter)
    entry.title = None
    entry.diary_text = None
    entry.status = DailyEntryStatus.DELETED.value
    entry.analysis_mode = None
    entry.deleted_at = datetime.now(timezone.utc)

    removed_character = encounter_count == 1
    if removed_character:
        db.delete(character)
    db.commit()
    delete_media("diary", photo_file)
    return removed_character


def clear_entry_character(db: Session, entry: DailyEntry) -> None:
    """Remove only the encounter/possibly orphaned character for regeneration."""
    encounter = entry.encounter
    if encounter is not None:
        character = encounter.character
        encounter_count = db.scalar(
            select(func.count()).select_from(Encounter).where(
                Encounter.character_id == character.id
            )
        ) or 0
        db.delete(encounter)
        entry.encounter = None
        if encounter_count == 1:
            db.delete(character)
    db.flush()


def clear_entry_generation(db: Session, entry: DailyEntry) -> None:
    """Remove generated analysis/encounter before re-analyzing an edited diary."""
    clear_entry_character(db, entry)
    if entry.analysis is not None:
        analysis = entry.analysis
        entry.analysis = None
        db.delete(analysis)
    db.flush()
