import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Character, CharacterShare
from app.schemas.shares import PublicSharedCharacter, ShareLink
from app.services.characters import appearance_for


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
        )
        .where(CharacterShare.token == token, CharacterShare.is_active.is_(True))
    )
    if share is None or not share.character.encounters:
        return None
    character = share.character
    latest = max(character.encounters, key=lambda item: item.met_on)
    return PublicSharedCharacter(
        owner_nickname=character.user.nickname,
        name=character.name,
        behavior_type=character.behavior_type,
        accessory_part=latest.accessory_part,
        effect_parts=latest.effect_parts,
        appearance=appearance_for(character),
    )
