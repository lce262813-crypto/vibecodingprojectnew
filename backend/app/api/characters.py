from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.characters import (
    CharacterCard,
    CharacterDetail,
    CharacterFavoriteUpdate,
    CharacterNameUpdate,
    EncounterDetail,
)
from app.services.characters import (
    delete_encounter,
    detail_for,
    encounter_detail_for,
    find_owned_character,
    find_owned_encounter,
    list_character_cards,
)

router = APIRouter(prefix="/api/characters", tags=["characters"])


def require_character(db: DatabaseSession, user: CurrentUser, character_id: str):
    character = find_owned_character(db, user, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="캐릭터를 찾을 수 없습니다.")
    return character


@router.get("", response_model=list[CharacterCard])
def list_characters(user: CurrentUser, db: DatabaseSession) -> list[CharacterCard]:
    return list_character_cards(db, user)


@router.get("/{character_id}", response_model=CharacterDetail)
def get_character(
    character_id: str, user: CurrentUser, db: DatabaseSession
) -> CharacterDetail:
    return detail_for(require_character(db, user, character_id))


@router.patch("/{character_id}/name", response_model=CharacterDetail)
def update_character_name(
    character_id: str,
    payload: CharacterNameUpdate,
    user: CurrentUser,
    db: DatabaseSession,
) -> CharacterDetail:
    character = require_character(db, user, character_id)
    character.name = payload.name
    db.commit()
    db.refresh(character)
    return detail_for(character)


@router.patch("/{character_id}/favorite", response_model=CharacterDetail)
def update_character_favorite(
    character_id: str,
    payload: CharacterFavoriteUpdate,
    user: CurrentUser,
    db: DatabaseSession,
) -> CharacterDetail:
    character = require_character(db, user, character_id)
    character.is_favorite = payload.is_favorite
    db.commit()
    db.refresh(character)
    return detail_for(character)


@router.get(
    "/{character_id}/encounters/{encounter_id}", response_model=EncounterDetail
)
def get_encounter(
    character_id: str,
    encounter_id: str,
    user: CurrentUser,
    db: DatabaseSession,
) -> EncounterDetail:
    encounter = find_owned_encounter(db, user, character_id, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="만남 기록을 찾을 수 없습니다.")
    try:
        return encounter_detail_for(encounter)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="만남 기록을 찾을 수 없습니다.") from exc


@router.delete(
    "/{character_id}/encounters/{encounter_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_encounter(
    character_id: str,
    encounter_id: str,
    user: CurrentUser,
    db: DatabaseSession,
) -> Response:
    encounter = find_owned_encounter(db, user, character_id, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="만남 기록을 찾을 수 없습니다.")
    delete_encounter(db, encounter)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
