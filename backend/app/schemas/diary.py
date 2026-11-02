from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.emotions import EmotionAnalysisResponse
from app.schemas.characters import CharacterResult

DiaryStatus = Literal[
    "not_started", "analyzing", "completed", "ai_failed", "deleted"
]


class DiaryCreateRequest(BaseModel):
    title: str | None = None
    diary_text: str

    @field_validator("title")
    @classmethod
    def title_length(cls, value: str | None) -> str | None:
        if value is None:
            return None
        title = value.strip()
        if not title:
            return None
        if len(title) > 100:
            raise ValueError("일기 제목은 100자 이하로 작성해 주세요.")
        return title

    @field_validator("diary_text")
    @classmethod
    def diary_length(cls, value: str) -> str:
        text = value.strip()
        if len(text) < 10:
            raise ValueError("일기는 10자 이상 작성해 주세요.")
        if len(text) > 2000:
            raise ValueError("일기는 2,000자 이하로 작성해 주세요.")
        return text


class DiaryTodayResponse(BaseModel):
    status: DiaryStatus
    entry_date: date
    entry_id: str | None = None
    title: str | None = None
    diary_text: str | None = None
    analysis: EmotionAnalysisResponse | None = None
    character: CharacterResult | None = None

    model_config = ConfigDict(from_attributes=True)


class DiaryCalendarRecord(BaseModel):
    entry_id: str
    entry_date: date
    title: str | None = None
    character: CharacterResult


class DiaryCalendarResponse(BaseModel):
    year: int
    month: int
    records: list[DiaryCalendarRecord]
