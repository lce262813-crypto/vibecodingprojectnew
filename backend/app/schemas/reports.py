from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.characters import CharacterResult
from app.schemas.emotions import BaseEmotionKey


class ReportPeriod(StrEnum):
    WEEK = "week"
    MONTH = "month"


class EmotionCount(BaseModel):
    emotion: BaseEmotionKey
    # Diaries where this was the chosen primary emotion.
    count: int = Field(ge=0)
    # Diaries where this emotion appeared at all; one diary can add to several emotions.
    appearance_count: int = Field(default=0, ge=0)


class EmotionGroupCount(BaseModel):
    group: str
    label: str
    count: int = Field(ge=0)


class KeywordCount(BaseModel):
    keyword: str
    count: int = Field(ge=1)


class EmotionTrendPoint(BaseModel):
    entry_date: date
    diary_count: int = Field(ge=1)
    primary_emotion: BaseEmotionKey
    average_intensity: float = Field(ge=0, le=100)
    expression_intensity: float = Field(default=1, ge=1, le=5)
    entry_id: str | None = None
    title: str | None = None
    summary: str | None = None
    co_emotions: list[BaseEmotionKey] = Field(default_factory=list)
    relationship_type: str | None = None


class PeriodComparison(BaseModel):
    start_date: date
    end_date: date
    diary_days: int = Field(ge=0)
    most_frequent_primary: BaseEmotionKey | None
    average_expression_intensity: float | None = Field(default=None, ge=1, le=5)


class EmotionReportResponse(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    diary_days: int = Field(ge=0)
    diary_count: int = Field(ge=0)
    most_frequent_primary: BaseEmotionKey | None
    emotion_counts: list[EmotionCount]
    group_counts: list[EmotionGroupCount]
    average_intensity: float | None = Field(default=None, ge=0, le=100)
    average_expression_intensity: float | None = Field(default=None, ge=1, le=5)
    legacy_intensity_converted: bool = False
    frequent_keywords: list[KeywordCount]
    trend: list[EmotionTrendPoint]
    previous: PeriodComparison | None = None
    custom_range: bool = False


class ReflectionEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str
    quote: str


class ReflectionDraft(BaseModel):
    """What the model must return. The server checks it before anything is shown."""

    model_config = ConfigDict(extra="forbid")

    title: str
    empathy: str
    insight: str | None
    underlying_need: str | None
    encouragement: str
    suggestion: str
    reflection_question: str | None
    evidence: list[ReflectionEvidence]
    limitations: list[str]
    safety_concern: bool


class ReflectionLetter(BaseModel):
    title: str
    empathy: str
    insight: str | None = None
    underlying_need: str | None = None
    encouragement: str
    suggestion: str | None = None
    reflection_question: str | None = None
    evidence_dates: list[date] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class SupportContact(BaseModel):
    name: str
    phone: str
    description: str


class ReflectionSafety(BaseModel):
    message: str
    resources: list[SupportContact]


class ReflectionResponse(BaseModel):
    period: ReportPeriod
    start_date: date
    end_date: date
    reflection: str
    letter: ReflectionLetter
    safety: ReflectionSafety | None = None
    provider: str
    model_name: str | None
    privacy_note: str


class PastEntry(BaseModel):
    entry_id: str
    entry_date: date
    title: str | None
    diary_text: str
    primary_emotion: BaseEmotionKey
    character: CharacterResult | None


class PastMoment(BaseModel):
    label: str
    target_date: date
    entries: list[PastEntry]


class OnThisDayResponse(BaseModel):
    anchor_date: date
    one_month_ago: PastMoment
    one_year_ago: PastMoment
