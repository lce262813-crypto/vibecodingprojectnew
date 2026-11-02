from fastapi import APIRouter, HTTPException, Response, status

from app.api.characters import require_character
from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.shares import PublicSharedCharacter, ShareLink
from app.services.shares import find_public_share, get_or_create_share, link_for, revoke_share

router = APIRouter(tags=["shares"])

EXPIRED_SHARE_MESSAGE = "공유가 끝났거나 찾을 수 없는 링크예요."


@router.post("/api/characters/{character_id}/share", response_model=ShareLink)
def create_share(character_id: str, user: CurrentUser, db: DatabaseSession) -> ShareLink:
    character = require_character(db, user, character_id)
    return link_for(get_or_create_share(db, character))


@router.delete(
    "/api/characters/{character_id}/share", status_code=status.HTTP_204_NO_CONTENT
)
def delete_share(character_id: str, user: CurrentUser, db: DatabaseSession) -> Response:
    revoke_share(db, require_character(db, user, character_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/api/shares/{token}", response_model=PublicSharedCharacter)
def get_public_share(token: str, db: DatabaseSession) -> PublicSharedCharacter:
    shared = find_public_share(db, token)
    if shared is None:
        raise HTTPException(status_code=404, detail=EXPIRED_SHARE_MESSAGE)
    return shared
