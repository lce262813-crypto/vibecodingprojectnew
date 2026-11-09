import hashlib
import json
import random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.characters import (
    ACCESSORY_PARTS,
    ALGORITHM_VERSION,
    BEHAVIOR_TYPES,
    EMOTION_PALETTES,
    EMOTION_SILHOUETTES,
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
from app.services.items import item_for_encounter
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
            ALGORITHM_VERSION,
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
    expression_emotion = payload.primary_emotion
    eyebrow, eye, mouth = EXPRESSION_RECIPES[expression_emotion]
    if intensity_level <= 2:
        eyebrow = "brow_soft"
    return eyebrow, eye, mouth


def effects_for(payload: EmotionAnalysisPayload, intensity_level: int) -> list[str]:
    del intensity_level
    # 몸통과 표정은 주감정, 외부 감정 이펙트는 보조감정만 담당한다.
    return []


OBJECT_DECORATIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("coffee", ("커피", "라떼", "아메리카노", "에스프레소")),
    ("drink", ("음료", "주스", "버블티", "밀크티", "에이드")),
    ("book", ("책", "교재", "소설", "문제집")),
    ("headphones", ("헤드폰", "이어폰")),
    ("flower", ("꽃", "장미", "튤립")),
    ("gamepad", ("게임패드", "컨트롤러")),
    ("umbrella", ("우산",)),
    ("sleepCap", ("수면 모자", "침대", "베개")),
    ("briefcase", ("서류 가방", "가방", "노트북 가방")),
    ("pencil", ("연필", "펜", "노트")),
    ("camera", ("카메라",)),
    ("ticket", ("티켓", "영화표", "입장권")),
    ("gift", ("선물",)),
    ("cake", ("케이크",)),
    ("phone", ("휴대폰", "핸드폰", "전화기")),
    ("medicine", ("약", "알약", "감기약")),
    ("meal", ("밥", "도시락", "식사")),
    ("sneaker", ("운동화",)),
    ("bag", ("여행 가방", "캐리어")),
)


def decoration_for(payload: EmotionAnalysisPayload) -> str | None:
    """Nothing is saved at creation: services/items.py chooses the item when a character is read."""
    del payload
    return None


def build_render_spec(
    payload: EmotionAnalysisPayload,
    *,
    seed: str,
    silhouette: str,
    palette: str,
    intensity_level: int,
) -> dict:
    scores = payload.base_emotions.model_dump()
    secondary = payload.secondary_emotions[0] if payload.secondary_emotions else None
    expression_emotion = payload.primary_emotion
    expression_level = level_for(scores[expression_emotion.value])
    return {
        "renderer_version": ALGORITHM_VERSION,
        "seed": int(seed[:8], 16),
        "primary_emotion": payload.primary_emotion.value,
        "primary_intensity": scores[payload.primary_emotion.value],
        "secondary_emotion": secondary.value if secondary else None,
        "secondary_intensity": scores[secondary.value] if secondary else 0,
        "silhouette_id": silhouette,
        "palette_id": payload.primary_emotion.value,
        "legacy_palette_id": palette,
        "expression_id": f"{expression_emotion.value}-{expression_level}",
        "effect_id": None,
        "decoration_id": decoration_for(payload),
        "animal_feature_id": None,
        "objects": list(payload.objects),
    }


def generate_name(emotion: BaseEmotionKey, rng: random.Random) -> str:
    return f"{rng.choice(NAME_PREFIXES[emotion])}{rng.choice(NAME_SUFFIXES)}"[:12]


def create_character_encounter(
    db: Session,
    entry: DailyEntry,
    payload: EmotionAnalysisPayload,
    *,
    review=None,
) -> tuple[Character, Encounter, bool]:
    existing_encounter = db.scalar(
        select(Encounter).where(Encounter.daily_entry_id == entry.id)
    )
    if existing_encounter is not None:
        return existing_encounter.character, existing_encounter, False

    fingerprint = build_fingerprint(payload)
    if review is not None:
        design = {
            "selected": review.selected_emotion.value,
            "emotions": [(item.emotion.value, item.intensity) for item in review.emotions],
            "secondary_relation": next((item.relation.value for item in review.emotions
                                         if item.emotion != review.selected_emotion and item.relation), None),
            "relationship": review.relationship.type.value,
            "sequence": [item.value for item in review.relationship.sequence],
            "objects": review.objects,
        }
        digest = hashlib.sha256(json.dumps(design, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:32]
        fingerprint = f"human-review-v1:{payload.primary_emotion.value}:{digest}"
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
        silhouette = EMOTION_SILHOUETTES[payload.primary_emotion]
        palette = rng.choice(EMOTION_PALETTES[payload.primary_emotion])
        character = Character(
            user_id=entry.user_id,
            fingerprint=fingerprint,
            algorithm_version=ALGORITHM_VERSION,
            seed=seed,
            name=generate_name(payload.primary_emotion, rng),
            body_part=silhouette,
            palette=palette,
            eyebrow_part=eyebrow,
            eye_part=eye,
            mouth_part=mouth,
            mutation_part=mutation,
            behavior_type=BEHAVIOR_TYPES[payload.primary_emotion],
            render_spec=build_render_spec(
                payload,
                seed=seed,
                silhouette=silhouette,
                palette=palette,
                intensity_level=intensity_level,
            ),
        )
        db.add(character)
        if review is not None:
            others = [item for item in review.emotions if item.emotion != review.selected_emotion]
            character.algorithm_version = "human-review-v1"
            character.mutation_part = None
            character.render_spec = {
                **character.render_spec,
                "renderer_version": "human-review-v1",
                "relationship_type": review.relationship.type.value,
                "relationship_sequence": [item.value for item in review.relationship.sequence],
                "expression_intensity": next(item.intensity for item in review.emotions if item.emotion == review.selected_emotion),
                "effect_emotions": [{
                    "emotion": item.emotion.value,
                    "intensity": item.intensity,
                    "relation": item.relation.value if item.relation else None,
                } for item in others],
                "secondary_relation": others[0].relation.value if others and others[0].relation else None,
                "effect_id": review.relationship.type.value.lower(),
            }
        db.flush()

    accessory = decoration_for(payload)

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
        accessory_part=item_for_encounter(encounter),
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
            renderer_version=character.algorithm_version,
            render_spec={
                **(character.render_spec or {}),
                "decoration_id": item_for_encounter(encounter),
            } if character.render_spec else None,
        ),
    )
