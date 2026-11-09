from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.models import Character, DailyEntry, DiaryPhoto
from app.schemas.auth import AccountDeleteRequest, NicknameUpdateRequest, PreferencesUpdateRequest, UserResponse
from app.schemas.personalization import BadgeListResponse
from app.services.auth import find_user_by_nickname
from app.services.auth import user_response
from app.services.media import MediaValidationError, delete_media, media_path, store_image
from app.services.security import verify_password
from app.services.badges import badges_for

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/badges", response_model=BadgeListResponse)
def get_badges(user: CurrentUser, db: DatabaseSession) -> BadgeListResponse:
    return badges_for(db, user)


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
    return user_response(user)


@router.patch("/preferences", response_model=UserResponse)
def update_preferences(
    payload: PreferencesUpdateRequest,
    user: CurrentUser,
    db: DatabaseSession,
) -> UserResponse:
    if payload.representative_character_id is not None:
        character = db.scalar(
            select(Character).where(
                Character.id == payload.representative_character_id,
                Character.user_id == user.id,
            )
        )
        if character is None:
            raise HTTPException(status_code=404, detail="대표 캐릭터를 찾을 수 없어요.")
    user.representative_character_id = payload.representative_character_id
    user.theme = payload.theme
    user.notifications_enabled = payload.notifications_enabled
    user.notification_time = payload.notification_time
    user.room_background = payload.room_background
    db.commit()
    db.refresh(user)
    return user_response(user)


@router.put("/avatar", response_model=UserResponse)
async def upload_avatar(
    request: Request,
    user: CurrentUser,
    db: DatabaseSession,
) -> UserResponse:
    data = await request.body()
    try:
        stored_name, _ = store_image("avatars", data, request.headers.get("content-type", ""), 2 * 1024 * 1024)
    except MediaValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    previous = user.avatar_file
    user.avatar_file = stored_name
    db.commit()
    delete_media("avatars", previous)
    return user_response(user)


@router.get("/avatar")
def get_avatar(user: CurrentUser) -> FileResponse:
    path = media_path("avatars", user.avatar_file or "")
    if path is None:
        raise HTTPException(status_code=404, detail="프로필 이미지가 없어요.")
    return FileResponse(path, headers={"Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff"})


@router.delete("/avatar", response_model=UserResponse)
def remove_avatar(user: CurrentUser, db: DatabaseSession) -> UserResponse:
    previous = user.avatar_file
    user.avatar_file = None
    db.commit()
    delete_media("avatars", previous)
    return user_response(user)


@router.get("/export")
def export_account_data(user: CurrentUser, db: DatabaseSession) -> dict:
    entries = db.scalars(
        select(DailyEntry)
        .options(selectinload(DailyEntry.analysis), selectinload(DailyEntry.encounter), selectinload(DailyEntry.photo))
        .where(DailyEntry.user_id == user.id)
        .order_by(DailyEntry.entry_date)
    ).all()
    characters = db.scalars(
        select(Character)
        .options(selectinload(Character.encounters), selectinload(Character.shares))
        .where(Character.user_id == user.id)
    ).all()

    payload = {
        "format_version": 1,
        "exported_at": datetime.now(timezone.utc),
        "profile": {
            "id": user.id,
            "email": user.email,
            "nickname": user.nickname,
            "coins": user.coins,
            "representative_character_id": user.representative_character_id,
            "theme": user.theme,
            "notifications_enabled": user.notifications_enabled,
            "notification_time": user.notification_time,
            "room_background": user.room_background,
            "has_avatar": user.avatar_file is not None,
            "created_at": user.created_at,
        },
        "diaries": [
            {
                "id": entry.id,
                "entry_date": entry.entry_date,
                "title": entry.title,
                "diary_text": entry.diary_text,
                "status": entry.status,
                "analysis_mode": entry.analysis_mode,
                "created_at": entry.created_at,
                "updated_at": entry.updated_at,
                "photo": None if entry.photo is None else {"content_type": entry.photo.content_type, "size_bytes": entry.photo.size_bytes},
                "analysis": None
                if entry.analysis is None
                else {
                    "schema_version": entry.analysis.schema_version,
                    "base_emotions": entry.analysis.base_emotions,
                    "primary_emotion": entry.analysis.primary_emotion,
                    "secondary_emotions": entry.analysis.secondary_emotions,
                    "primary_ratio": entry.analysis.primary_ratio,
                    "secondary_ratio": entry.analysis.secondary_ratio,
                    "detail_states": entry.analysis.detail_states,
                    "energy": entry.analysis.energy,
                    "keywords": entry.analysis.keywords,
                    "event_summary": entry.analysis.event_summary,
                    "reason": entry.analysis.reason,
                    "events": entry.analysis.events,
                    "objects": entry.analysis.objects,
                    "confidence": entry.analysis.confidence,
                    "uncertainty_note": entry.analysis.uncertainty_note,
                    "display_emotions": entry.analysis.display_emotions,
                    "analysis_mode": entry.analysis.analysis_mode,
                    "provider": entry.analysis.provider,
                    "model_name": entry.analysis.model_name,
                    "prompt_version": entry.analysis.prompt_version,
                    "is_user_edited": entry.analysis.is_user_edited,
                    "user_override": entry.analysis.user_override,
                    "ai_original": entry.analysis.ai_original,
                    "review": entry.analysis.review,
                    "review_revision": entry.analysis.review_revision,
                },
                "encounter_id": entry.encounter.id if entry.encounter else None,
            }
            for entry in entries
        ],
        "characters": [
            {
                "id": character.id,
                "name": character.name,
                "fingerprint": character.fingerprint,
                "algorithm_version": character.algorithm_version,
                "seed": character.seed,
                "render_spec": character.render_spec,
                "appearance": {
                    "body_part": character.body_part,
                    "palette": character.palette,
                    "eyebrow_part": character.eyebrow_part,
                    "eye_part": character.eye_part,
                    "mouth_part": character.mouth_part,
                    "mutation_part": character.mutation_part,
                },
                "behavior_type": character.behavior_type,
                "is_resident": character.is_resident,
                "is_favorite": character.is_favorite,
                "encounter_ids": [item.id for item in character.encounters],
                "active_share_tokens": [
                    share.token for share in character.shares if share.is_active
                ],
            }
            for character in characters
        ],
        "privacy_note": (
            "이 파일에는 사용자가 작성한 일기 원문과 AI 감정 분석 결과가 포함되어 "
            "있습니다. 안전한 장소에 보관해 주세요."
        ),
    }
    return jsonable_encoder(payload)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    payload: AccountDeleteRequest,
    response: Response,
    user: CurrentUser,
    db: DatabaseSession,
) -> Response:
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=403, detail="비밀번호가 맞지 않습니다.")

    avatar_file = user.avatar_file
    photo_files = list(
        db.scalars(
            select(DiaryPhoto.stored_name)
            .join(DailyEntry, DiaryPhoto.daily_entry_id == DailyEntry.id)
            .where(DailyEntry.user_id == user.id)
        ).all()
    )
    db.delete(user)
    db.commit()
    delete_media("avatars", avatar_file)
    for stored_name in photo_files:
        delete_media("diary", stored_name)
    settings = get_settings()
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
