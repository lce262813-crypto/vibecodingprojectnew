from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.constants.dialogues import DIALOGUES
from app.models import Character, User
from app.schemas.emotions import BaseEmotionKey
from app.schemas.room import ResidentListResponse, RoomResident
from app.services.characters import card_for

RESIDENT_LIMIT = 5


def list_residents(db: Session, user: User) -> ResidentListResponse:
    characters = db.scalars(
        select(Character)
        .options(selectinload(Character.encounters))
        .where(Character.user_id == user.id, Character.is_resident.is_(True))
        .order_by(Character.updated_at)
    ).all()
    residents: list[RoomResident] = []
    for character in characters:
        if not character.encounters:
            continue
        latest = max(character.encounters, key=lambda item: item.met_on)
        emotion = BaseEmotionKey(character.fingerprint.split(":", 1)[0])
        residents.append(
            RoomResident(
                character=card_for(character),
                intensity_level=latest.intensity_level,
                accessory_part=latest.accessory_part,
                effect_parts=latest.effect_parts,
                dialogue_lines=list(DIALOGUES[emotion]),
            )
        )
    return ResidentListResponse(
        residents=residents,
        count=len(residents),
        limit=RESIDENT_LIMIT,
    )


def resident_count(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count()).select_from(Character).where(
            Character.user_id == user.id,
            Character.is_resident.is_(True),
        )
    ) or 0
