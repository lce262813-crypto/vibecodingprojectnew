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
from app.services.character_generator import encounter_to_response


def find_owned_character(db: Session, user: User, character_id: str) -> Character | None:
    return db.scalar(
        select(Character)
        .options(selectinload(Character.encounters))
        .where(Character.id == character_id, Character.user_id == user.id)
    )


def appearance_for(character: Character) -> CharacterAppearance:
    return CharacterAppearance(
        body_part=character.body_part,
        palette=character.palette,
        color=PALETTE_COLORS[character.palette],
        eyebrow_part=character.eyebrow_part,
        eye_part=character.eye_part,
        mouth_part=character.mouth_part,
        mutation_part=character.mutation_part,
    )


def card_for(character: Character) -> CharacterCard:
    encounters = sorted(character.encounters, key=lambda item: item.met_on)
    return CharacterCard(
        character_id=character.id,
        name=character.name,
        primary_emotion=BaseEmotionKey(character.fingerprint.split(":", 1)[0]),
        behavior_type=character.behavior_type,
        is_resident=character.is_resident,
        encounter_count=len(encounters),
        first_met_on=encounters[0].met_on,
        last_met_on=encounters[-1].met_on,
        appearance=appearance_for(character),
    )


def list_character_cards(db: Session, user: User) -> list[CharacterCard]:
    characters = db.scalars(
        select(Character)
        .options(selectinload(Character.encounters))
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
                accessory_part=item.accessory_part,
                effect_parts=item.effect_parts,
            )
            for item in encounters
        ],
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
    encounter_count = db.scalar(
        select(func.count()).select_from(Encounter).where(
            Encounter.character_id == character.id
        )
    ) or 0

    if entry.analysis is not None:
        db.delete(entry.analysis)
    db.delete(encounter)
    entry.title = None
    entry.diary_text = None
    entry.status = DailyEntryStatus.DELETED.value
    entry.analysis_mode = None

    removed_character = encounter_count == 1
    if removed_character:
        db.delete(character)
    db.commit()
    return removed_character
