from fastapi import APIRouter, HTTPException

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.room import ResidentListResponse
from app.services.characters import find_owned_character
from app.services.room import RESIDENT_LIMIT, list_residents, resident_count

router = APIRouter(prefix="/api/room", tags=["room"])


@router.get("/residents", response_model=ResidentListResponse)
def get_residents(user: CurrentUser, db: DatabaseSession) -> ResidentListResponse:
    return list_residents(db, user)


@router.put("/residents/{character_id}", response_model=ResidentListResponse)
def move_in(
    character_id: str, user: CurrentUser, db: DatabaseSession
) -> ResidentListResponse:
    character = find_owned_character(db, user, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")
    if not character.is_resident:
        if resident_count(db, user) >= RESIDENT_LIMIT:
            raise HTTPException(
                status_code=409,
                detail="감정 방에는 최대 5마리까지 입주할 수 있습니다.",
            )
        character.is_resident = True
        db.commit()
    return list_residents(db, user)


@router.delete(
    "/residents/{character_id}", response_model=ResidentListResponse
)
def move_out(
    character_id: str, user: CurrentUser, db: DatabaseSession
) -> ResidentListResponse:
    character = find_owned_character(db, user, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")
    if character.is_resident:
        character.is_resident = False
        db.commit()
    return list_residents(db, user)
