import hashlib
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.characters import (
    ACCESSORY_PARTS,
    ALGORITHM_VERSION,
    BEHAVIOR_TYPES,
    BODY_PARTS,
    DETAIL_EFFECTS,
    EMOTION_EFFECTS,
    EMOTION_PALETTES,
    EXPRESSION_RECIPES,
    MUTATION_PARTS,
    NAME_PREFIXES,
    NAME_SUFFIXES,
    PALETTE_COLORS,
)
from app.constants.emotions import EMOTION_LABELS
from app.models import Character, DailyEntry, Encounter
from app.schemas.characters import CharacterAppearance, CharacterResult
from app.schemas.emotions import BaseEmotionKey, EmotionAnalysisPayload
from app.services.shop import award_diary_coins


def level_for(score: int) -> int:
    if score < 20:
        return 1
    if score < 40:
        return 2
    if score < 60:
        return 3
    if score < 80:
        return 4
    return 5


def build_fingerprint(payload: EmotionAnalysisPayload) -> str:
    scores = payload.base_emotions.model_dump()
    primary_level = level_for(scores[payload.primary_emotion.value])
    secondary = payload.secondary_emotions[0].value if payload.secondary_emotions else "none"
    detail = (
        max(payload.detail_states, key=lambda item: item.confidence).key.value
        if payload.detail_states
        else "none"
    )
    return ":".join(
        (
            payload.primary_emotion.value,
            str(primary_level),
            secondary,
            detail,
            str(level_for(payload.energy)),
        )
    )


def seed_for(user_id: str, fingerprint: str) -> str:
    source = f"{ALGORITHM_VERSION}:{user_id}:{fingerprint}".encode()
    return hashlib.sha256(source).hexdigest()


def expression_for(
    payload: EmotionAnalysisPayload, intensity_level: int
) -> tuple[str, str, str]:
    eyebrow, eye, mouth = EXPRESSION_RECIPES[payload.primary_emotion]
    if payload.secondary_emotions:
        secondary_brow = EXPRESSION_RECIPES[payload.secondary_emotions[0]][0]
        eyebrow = secondary_brow
    if intensity_level <= 2:
        eyebrow = "brow_soft"
    return eyebrow, eye, mouth


def effects_for(payload: EmotionAnalysisPayload, intensity_level: int) -> list[str]:
    effects: list[str] = []
    if intensity_level >= 3:
        effects.append(EMOTION_EFFECTS[payload.primary_emotion])
    if payload.detail_states:
        detail = max(payload.detail_states, key=lambda item: item.confidence).key
        detail_effect = DETAIL_EFFECTS.get(detail)
        if detail_effect and detail_effect not in effects:
            effects.append(detail_effect)
    if intensity_level == 5:
        effects.append("intense_aura")
    return effects


def generate_name(emotion: BaseEmotionKey, rng: random.Random) -> str:
    return f"{rng.choice(NAME_PREFIXES[emotion])}{rng.choice(NAME_SUFFIXES)}"[:12]


def create_character_encounter(
    db: Session,
    entry: DailyEntry,
    payload: EmotionAnalysisPayload,
) -> tuple[Character, Encounter, bool]:
    existing_encounter = db.scalar(
        select(Encounter).where(Encounter.daily_entry_id == entry.id)
    )
    if existing_encounter is not None:
        return existing_encounter.character, existing_encounter, False

    fingerprint = build_fingerprint(payload)
    character = db.scalar(
        select(Character).where(
            Character.user_id == entry.user_id,
            Character.fingerprint == fingerprint,
        )
    )
    is_new = character is None
    primary_score = payload.base_emotions.model_dump()[payload.primary_emotion.value]
    intensity_level = level_for(primary_score)

    if character is None:
        seed = seed_for(entry.user_id, fingerprint)
        rng = random.Random(int(seed[:16], 16))
        eyebrow, eye, mouth = expression_for(payload, intensity_level)
        mutation = rng.choice(MUTATION_PARTS) if rng.random() < 0.15 else None
        character = Character(
            user_id=entry.user_id,
            fingerprint=fingerprint,
            algorithm_version=ALGORITHM_VERSION,
            seed=seed,
            name=generate_name(payload.primary_emotion, rng),
            body_part=rng.choice(BODY_PARTS),
            palette=rng.choice(EMOTION_PALETTES[payload.primary_emotion]),
            eyebrow_part=eyebrow,
            eye_part=eye,
            mouth_part=mouth,
            mutation_part=mutation,
            behavior_type=BEHAVIOR_TYPES[payload.primary_emotion],
        )
        db.add(character)
        db.flush()

    accessory = None
    if payload.keywords:
        accessory = ACCESSORY_PARTS[payload.keywords[0].category]

    encounter = Encounter(
        character_id=character.id,
        daily_entry_id=entry.id,
        intensity_level=intensity_level,
        accessory_part=accessory,
        effect_parts=effects_for(payload, intensity_level),
        dialogue_group=payload.primary_emotion.value,
        met_on=entry.entry_date,
    )
    db.add(encounter)
    award_diary_coins(db, entry.user_id, is_new)
    db.flush()
    return character, encounter, is_new


def encounter_to_response(
    encounter: Encounter,
    primary_emotion: str,
    *,
    is_new_character: bool | None = None,
) -> CharacterResult:
    character = encounter.character
    emotion = BaseEmotionKey(primary_emotion)
    mutation_text = " 특별한 돌연변이 파츠도 지녔어요." if character.mutation_part else ""
    return CharacterResult(
        character_id=character.id,
        encounter_id=encounter.id,
        name=character.name,
        fingerprint=character.fingerprint,
        primary_emotion=emotion,
        intensity_level=encounter.intensity_level,
        behavior_type=character.behavior_type,
        accessory_part=encounter.accessory_part,
        effect_parts=encounter.effect_parts,
        feature_description=(
            f"{EMOTION_LABELS[emotion]}의 표정과 오늘의 분위기를 담은 감정 몬스터예요."
            f"{mutation_text}"
        ),
        is_new_character=(
            len(character.encounters) == 1
            if is_new_character is None
            else is_new_character
        ),
        appearance=CharacterAppearance(
            body_part=character.body_part,
            palette=character.palette,
            color=PALETTE_COLORS[character.palette],
            eyebrow_part=character.eyebrow_part,
            eye_part=character.eye_part,
            mouth_part=character.mouth_part,
            mutation_part=character.mutation_part,
        ),
    )
