import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Character, CharacterShare, DailyEntry, Encounter, EmotionAnalysis
from app.constants.characters import PALETTE_COLORS
from app.constants.emotions import EMOTION_LABELS
from app.schemas.emotions import BaseEmotionKey
from app.schemas.shares import PublicCharacterAppearance, PublicCharacterRenderSpec, PublicEmotion, PublicSharedCharacter, ShareLink
from app.services.items import item_for_encounter


def link_for(share: CharacterShare) -> ShareLink:
    return ShareLink(token=share.token, share_path=f"/share/{share.token}")


def active_share_for(db: Session, character: Character) -> CharacterShare | None:
    return db.scalar(
        select(CharacterShare).where(
            CharacterShare.character_id == character.id,
            CharacterShare.is_active.is_(True),
        )
    )


def get_or_create_share(db: Session, character: Character) -> CharacterShare:
    share = active_share_for(db, character)
    if share is not None:
        return share
    share = CharacterShare(character_id=character.id, token=secrets.token_urlsafe(24))
    db.add(share)
    db.commit()
    db.refresh(share)
    return share


def revoke_share(db: Session, character: Character) -> None:
    share = active_share_for(db, character)
    if share is None:
        return
    share.is_active = False
    share.revoked_at = datetime.now(timezone.utc)
    db.commit()


def find_public_share(db: Session, token: str) -> PublicSharedCharacter | None:
    share = db.scalar(
        select(CharacterShare)
        .options(
            selectinload(CharacterShare.character).selectinload(Character.encounters),
            selectinload(CharacterShare.character).selectinload(Character.user),
            selectinload(CharacterShare.character)
            .selectinload(Character.encounters)
            .selectinload(Encounter.daily_entry)
            .selectinload(DailyEntry.analysis),
        )
        .where(CharacterShare.token == token, CharacterShare.is_active.is_(True))
    )
    if share is None or not share.character.encounters:
        return None
    character = share.character
    latest = max(character.encounters, key=lambda item: item.met_on)
    analysis = latest.daily_entry.analysis
    render_spec = character.render_spec or {}
    emotions: list[PublicEmotion] = []
    relationship_type = None
    if analysis and isinstance(analysis.review, dict):
        review = analysis.review
        selected = review.get("selected_emotion") or review.get("recommended_emotion")
        relationship = review.get("relationship")
        relationship_type = relationship.get("type") if isinstance(relationship, dict) else None
        for item in review.get("emotions", []):
            try:
                key = BaseEmotionKey(item["emotion"])
            except (KeyError, ValueError, TypeError):
                continue
            emotions.append(PublicEmotion(
                key=key,
                label=EMOTION_LABELS[key],
                intensity=item.get("intensity"),
                is_primary=key.value == selected,
            ))
    elif analysis and analysis.primary_emotion:
        legacy_keys = [analysis.primary_emotion, *(analysis.secondary_emotions or [])]
        for index, raw_key in enumerate(legacy_keys):
            try:
                key = BaseEmotionKey(raw_key)
            except ValueError:
                continue
            score = analysis.primary_intensity if index == 0 else analysis.secondary_intensity
            intensity = max(1, min(4, (score + 24) // 25)) if score else None
            emotions.append(PublicEmotion(
                key=key,
                label=EMOTION_LABELS[key],
                intensity=intensity,
                is_primary=index == 0,
            ))
    secondary_emotion = render_spec.get("secondary_emotion")
    secondary_intensity = render_spec.get("secondary_intensity", 0)
    if not secondary_emotion and render_spec.get("effect_emotions"):
        secondary = render_spec["effect_emotions"][0]
        secondary_emotion = secondary.get("emotion")
        secondary_intensity = {1: 10, 2: 30, 3: 50, 4: 70, 5: 90}.get(secondary.get("intensity"), 0)
    public_render_spec = None
    if all(key in render_spec for key in ("renderer_version", "seed", "primary_emotion", "primary_intensity", "silhouette_id")):
        public_render_spec = PublicCharacterRenderSpec(
            renderer_version=render_spec["renderer_version"],
            seed=render_spec["seed"],
            primary_emotion=render_spec["primary_emotion"],
            primary_intensity=render_spec["primary_intensity"],
            secondary_emotion=secondary_emotion,
            secondary_intensity=secondary_intensity,
            secondary_relation=render_spec.get("secondary_relation"),
            silhouette_id=render_spec["silhouette_id"],
            decoration_id=item_for_encounter(latest),
            animal_feature_id=render_spec.get("animal_feature_id"),
        )
    return PublicSharedCharacter(
        owner_nickname=character.user.nickname,
        name=character.name,
        behavior_type=character.behavior_type,
        accessory_part=item_for_encounter(latest),
        effect_parts=latest.effect_parts,
        appearance=PublicCharacterAppearance(
            body_part=character.body_part,
            palette=character.palette,
            color=PALETTE_COLORS[character.palette],
            eyebrow_part=character.eyebrow_part,
            eye_part=character.eye_part,
            mouth_part=character.mouth_part,
            mutation_part=character.mutation_part,
            renderer_version=character.algorithm_version,
            render_spec=public_render_spec,
        ),
        emotions=emotions,
        relationship_type=relationship_type,
    )
