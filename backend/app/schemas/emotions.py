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

    schema_version: int = Field(default=2, ge=1, le=2)
    base_emotions: BaseEmotionScores
    primary_emotion: BaseEmotionKey
    secondary_emotions: list[BaseEmotionKey] = Field(max_length=1)
    primary_ratio: int | None = Field(default=None, ge=0, le=100)
    secondary_ratio: int | None = Field(default=None, ge=0, le=100)
    detail_states: list[DetailStateResult] = Field(max_length=3)
    energy: int = Field(ge=0, le=100)
    keywords: list[KeywordResult] = Field(max_length=5)
    event_summary: str = Field(min_length=1, max_length=200)
    reason: str | None = Field(default=None, min_length=1, max_length=500)
    events: list[str] = Field(default_factory=list, max_length=5)
    objects: list[str] = Field(default_factory=list, max_length=8)
    confidence: int = Field(default=50, ge=0, le=100)
    uncertainty_note: str | None = Field(default=None, max_length=300)

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

        if self.secondary_emotions:
            secondary = self.secondary_emotions[0]
            secondary_score = scores[secondary.value]
            total = primary_score + secondary_score
            derived_primary = round(primary_score / total * 100) if total else 50
            primary_ratio = self.primary_ratio if self.primary_ratio is not None else derived_primary
            secondary_ratio = (
                self.secondary_ratio
                if self.secondary_ratio is not None
                else 100 - primary_ratio
            )
            if primary_ratio + secondary_ratio != 100:
                raise ValueError("주요 감정과 보조 감정의 비중 합은 100이어야 합니다.")
        else:
            primary_ratio = 100 if self.primary_ratio is None else self.primary_ratio
            secondary_ratio = 0 if self.secondary_ratio is None else self.secondary_ratio
            if primary_ratio != 100 or secondary_ratio != 0:
                raise ValueError("보조 감정이 없으면 주요 감정 비중은 100이어야 합니다.")

        object.__setattr__(self, "primary_ratio", primary_ratio)
        object.__setattr__(self, "secondary_ratio", secondary_ratio)
        if self.reason is None:
            object.__setattr__(self, "reason", self.event_summary)
        if self.confidence < 50 and not self.uncertainty_note:
            object.__setattr__(
                self,
                "uncertainty_note",
                "감정 표현이 뚜렷하지 않아 분석 결과가 불확실할 수 있어요.",
            )
        return self


class DisplayEmotion(BaseModel):
    key: BaseEmotionKey
    label: str
    percentage: int | None = Field(default=None, ge=0, le=100)
    intensity: int | None = Field(default=None, ge=1, le=5)


class EmotionAnalysisResponse(BaseModel):
    schema_version: int
    base_emotions: dict[str, int]
    primary_emotion: BaseEmotionKey | None
    secondary_emotions: list[BaseEmotionKey]
    primary_ratio: int | None
    secondary_ratio: int | None
    primary_intensity: int
    secondary_intensity: int
    detail_states: list[DetailStateResult]
    energy: int
    keywords: list[KeywordResult]
    event_summary: str
    reason: str
    events: list[str]
    objects: list[str]
    confidence: int
    uncertainty_note: str | None
    display_emotions: list[DisplayEmotion]
    analysis_mode: str
    provider: str | None = None
    model_name: str | None = None
    prompt_version: str | None = None
    is_user_edited: bool = False
    review: dict | None = None
    review_revision: int = 0
    ai_original: dict | None = None


class EmotionAnalysisUpdateRequest(BaseModel):
    primary_emotion: BaseEmotionKey
    secondary_emotion: BaseEmotionKey | None = None
    primary_ratio: int = Field(ge=1, le=100)
    secondary_ratio: int = Field(ge=0, le=99)
    primary_intensity: int = Field(ge=0, le=100)
    secondary_intensity: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_update(self) -> "EmotionAnalysisUpdateRequest":
        if self.secondary_emotion is None:
            if self.primary_ratio != 100 or self.secondary_ratio != 0:
                raise ValueError("보조 감정이 없으면 주요 감정 비중은 100이어야 합니다.")
            if self.secondary_intensity != 0:
                raise ValueError("보조 감정이 없으면 보조 감정 강도는 0이어야 합니다.")
        else:
            if self.secondary_emotion == self.primary_emotion:
                raise ValueError("주요 감정과 보조 감정은 서로 달라야 합니다.")
            if self.primary_ratio + self.secondary_ratio != 100:
                raise ValueError("주요 감정과 보조 감정의 비중 합은 100이어야 합니다.")
        return self
