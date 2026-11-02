from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.auth import NicknameUpdateRequest, UserResponse
from app.services.auth import find_user_by_nickname

router = APIRouter(prefix="/api/account", tags=["account"])


@router.patch("/nickname", response_model=UserResponse)
def update_nickname(
    payload: NicknameUpdateRequest,
    user: CurrentUser,
    db: DatabaseSession,
) -> UserResponse:
    existing = find_user_by_nickname(db, payload.nickname)
    if existing is not None and existing.id != user.id:
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")

    user.nickname = payload.nickname
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.") from None
    db.refresh(user)
    return UserResponse.model_validate(user)
