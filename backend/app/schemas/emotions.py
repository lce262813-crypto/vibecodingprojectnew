from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BaseEmotionKey(StrEnum):
    JOY = "joy"
    EXCITEMENT = "excitement"
    CALM = "calm"
    PRIDE = "pride"
    MOVED = "moved"
    SADNESS = "sadness"
    ANGER = "anger"
    IRRITATION = "irritation"
    ANXIETY = "anxiety"
    LONELINESS = "loneliness"
    DISAPPOINTMENT = "disappointment"
    EMBARRASSMENT = "embarrassment"
    CONFUSION = "confusion"
    SHYNESS = "shyness"
    FATIGUE = "fatigue"
    LETHARGY = "lethargy"


class DetailStateKey(StrEnum):
    REALITY_HIT = "reality_hit"
    MENTAL_BREAKDOWN = "mental_breakdown"
    BOTHERED = "bothered"
    BOREDOM = "boredom"
    UNFAIRNESS = "unfairness"
    HURT_FEELINGS = "hurt_feelings"
    JEALOUSY = "jealousy"
    REGRET = "regret"
    SELF_BLAME = "self_blame"
    PRESSURE = "pressure"
    IMPATIENCE = "impatience"
    FEAR = "fear"
    FRUSTRATION = "frustration"
    EMPTINESS = "emptiness"
    RESIGNATION = "resignation"
    RELIEF = "relief"
    ANTICIPATION = "anticipation"
    CURIOSITY = "curiosity"
    SATISFACTION = "satisfaction"
    CONFIDENCE = "confidence"


class KeywordCategory(StrEnum):
    WORK = "work"
    STUDY = "study"
    DRINK = "drink"
    SOCIAL = "social"
    NATURE = "nature"
    TRAVEL = "travel"
    HEALTH = "health"
    HOBBY = "hobby"
    FOOD = "food"
    DAILY = "daily"


class BaseEmotionScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    joy: int = Field(ge=0, le=100)
    excitement: int = Field(ge=0, le=100)
    calm: int = Field(ge=0, le=100)
    pride: int = Field(ge=0, le=100)
    moved: int = Field(ge=0, le=100)
    sadness: int = Field(ge=0, le=100)
    anger: int = Field(ge=0, le=100)
    irritation: int = Field(ge=0, le=100)
    anxiety: int = Field(ge=0, le=100)
    loneliness: int = Field(ge=0, le=100)
    disappointment: int = Field(ge=0, le=100)
    embarrassment: int = Field(ge=0, le=100)
    confusion: int = Field(ge=0, le=100)
    shyness: int = Field(ge=0, le=100)
    fatigue: int = Field(ge=0, le=100)
    lethargy: int = Field(ge=0, le=100)


class DetailStateResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: DetailStateKey
    confidence: int = Field(ge=0, le=100)


class KeywordResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=30)
    category: KeywordCategory


class EmotionAnalysisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = Field(default=1, ge=1, le=1)
    base_emotions: BaseEmotionScores
    primary_emotion: BaseEmotionKey
    secondary_emotions: list[BaseEmotionKey] = Field(max_length=2)
    detail_states: list[DetailStateResult] = Field(max_length=3)
    energy: int = Field(ge=0, le=100)
    keywords: list[KeywordResult] = Field(max_length=5)
    event_summary: str = Field(min_length=1, max_length=200)

    @field_validator("secondary_emotions")
    @classmethod
    def unique_secondary_emotions(
        cls, values: list[BaseEmotionKey]
    ) -> list[BaseEmotionKey]:
        if len(values) != len(set(values)):
            raise ValueError("보조 감정은 중복될 수 없습니다.")
        return values

    @field_validator("detail_states")
    @classmethod
    def unique_detail_states(
        cls, values: list[DetailStateResult]
    ) -> list[DetailStateResult]:
        keys = [value.key for value in values]
        if len(keys) != len(set(keys)):
            raise ValueError("세부 상태는 중복될 수 없습니다.")
        return values

    @model_validator(mode="after")
    def validate_emotion_relationships(self) -> "EmotionAnalysisPayload":
        if self.primary_emotion in self.secondary_emotions:
            raise ValueError("주요 감정은 보조 감정에 다시 포함할 수 없습니다.")

        scores = self.base_emotions.model_dump()
        primary_score = scores[self.primary_emotion.value]
        if primary_score < max(scores.values()):
            raise ValueError("주요 감정은 가장 높은 기본 감정 점수여야 합니다.")
        return self


class DisplayEmotion(BaseModel):
    key: BaseEmotionKey
    label: str
    percentage: int = Field(ge=0, le=100)


class EmotionAnalysisResponse(BaseModel):
    schema_version: int
    base_emotions: dict[str, int]
    primary_emotion: BaseEmotionKey
    secondary_emotions: list[BaseEmotionKey]
    detail_states: list[DetailStateResult]
    energy: int
    keywords: list[KeywordResult]
    event_summary: str
    display_emotions: list[DisplayEmotion]
    analysis_mode: str
