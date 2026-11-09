import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Literal

NICKNAME_PATTERN = re.compile(r"^[가-힣A-Za-z0-9_]+$")


def validate_nickname(value: str) -> str:
    nickname = value.strip()
    if not 1 <= len(nickname) <= 20:
        raise ValueError("닉네임은 1~20자로 입력해 주세요.")
    if not NICKNAME_PATTERN.fullmatch(nickname):
        raise ValueError("닉네임에는 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.")
    return nickname


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    nickname: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("nickname")
    @classmethod
    def nickname_rules(cls, value: str) -> str:
        return validate_nickname(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=64)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    nickname: str
    avatar_url: str | None = None
    representative_character_id: str | None = None
    theme: str = "cream"
    notifications_enabled: bool = False
    notification_time: str = "21:00"
    room_background: str = "cream"
    tutorial_completed: bool = False
    tutorial_step: int = 0
    is_demo_account: bool = False

    model_config = ConfigDict(from_attributes=True)


class TutorialStepRequest(BaseModel):
    step: int = Field(ge=0, le=4)


class MessageResponse(BaseModel):
    message: str


class NicknameUpdateRequest(BaseModel):
    nickname: str

    @field_validator("nickname")
    @classmethod
    def nickname_rules(cls, value: str) -> str:
        return validate_nickname(value)


class AccountDeleteRequest(BaseModel):
    password: str = Field(min_length=1, max_length=64)


class PreferencesUpdateRequest(BaseModel):
    representative_character_id: str | None = None
    theme: Literal["cream", "lavender", "night"]
    notifications_enabled: bool
    notification_time: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    room_background: Literal["cream", "lavender", "night"]
