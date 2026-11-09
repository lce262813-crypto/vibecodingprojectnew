from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentAuthSession, CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    SignupRequest,
    TutorialStepRequest,
    UserResponse,
)
from app.services.auth import (
    authenticate_user,
    create_user,
    find_user_by_email,
    find_user_by_nickname,
    issue_session,
    user_response,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED
)
def signup(payload: SignupRequest, db: DatabaseSession) -> MessageResponse:
    if find_user_by_email(db, str(payload.email)):
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
    if find_user_by_nickname(db, payload.nickname):
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")

    try:
        create_user(db, str(payload.email), payload.password, payload.nickname)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="이미 사용 중인 이메일 또는 닉네임입니다."
        ) from None

    return MessageResponse(message="회원가입이 완료되었습니다. 로그인해 주세요.")


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: DatabaseSession) -> UserResponse:
    user = authenticate_user(db, str(payload.email), payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 맞지 않습니다.",
        )

    settings = get_settings()
    token, _ = issue_session(db, user, settings.session_ttl_days)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    return user_response(user)


@router.get("/me", response_model=UserResponse)
def current_user(user: CurrentUser) -> UserResponse:
    return user_response(user)


@router.put("/tutorial/step", response_model=UserResponse)
def save_tutorial_step(
    payload: TutorialStepRequest, user: CurrentUser, db: DatabaseSession
) -> UserResponse:
    """Remember where a new member stopped so the next login resumes there."""
    if user.tutorial_completed_at is None:
        user.tutorial_step = payload.step
        db.commit()
    return user_response(user)


@router.post("/tutorial/complete", response_model=UserResponse)
def complete_tutorial(user: CurrentUser, db: DatabaseSession) -> UserResponse:
    """Finish the tutorial for this account. It grants nothing, so replays cannot reward twice."""
    if user.tutorial_completed_at is None:
        user.tutorial_completed_at = datetime.now(timezone.utc)
        db.commit()
    return user_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    auth_session: CurrentAuthSession,
    db: DatabaseSession,
) -> Response:
    settings = get_settings()
    auth_session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
