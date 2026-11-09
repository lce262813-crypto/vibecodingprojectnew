from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.emotions import BaseEmotionKey


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RelationshipType(StrEnum):
    SINGLE = "SINGLE"
    MIXED = "MIXED"
    TRANSITION = "TRANSITION"
    CONTRAST = "CONTRAST"
    UNCERTAIN = "UNCERTAIN"


class SecondaryEmotionRelation(StrEnum):
    COMPANION = "companion"
    RESIDUAL = "residual"
    RELIEF = "relief"
    REVERSAL = "reversal"


class EmotionEvidence(StrictModel):
    emotion: BaseEmotionKey
    intensity: int = Field(ge=1, le=5, strict=True)
    evidence: str = Field(min_length=1, max_length=2000)
    event: str = Field(max_length=200)
    explanation: str = Field(min_length=1, max_length=300)
    relation: SecondaryEmotionRelation | None = None


class EmotionRelationship(StrictModel):
    type: RelationshipType
    sequence: list[BaseEmotionKey] = Field(max_length=3)
    explanation: str = Field(min_length=1, max_length=500)


def check_relationship(emotions, relationship):
    keys = [item.emotion for item in emotions]
    if len(keys) != len(set(keys)):
        raise ValueError("같은 감정은 중복할 수 없습니다.")
    sequence = relationship.sequence
    if len(sequence) != len(set(sequence)) or any(key not in keys for key in sequence):
        raise ValueError("감정 흐름은 선택된 감정만 한 번씩 포함해야 합니다.")
    if relationship.type == RelationshipType.SINGLE and len(keys) != 1:
        raise ValueError("단일 감정에는 감정 하나가 필요합니다.")
    if relationship.type in (RelationshipType.MIXED, RelationshipType.TRANSITION) and len(keys) < 2:
        raise ValueError("복합 감정과 감정 변화에는 두 가지 이상이 필요합니다.")
    if relationship.type == RelationshipType.TRANSITION and set(sequence) != set(keys):
        raise ValueError("변화 순서에 모든 감정을 포함해 주세요.")
    if relationship.type != RelationshipType.TRANSITION and sequence:
        raise ValueError("변화 유형에서만 순서를 지정할 수 있습니다.")
    if not keys and relationship.type != RelationshipType.UNCERTAIN:
        raise ValueError("감정이 없으면 불확실 상태여야 합니다.")


class EvidenceAnalysisPayload(StrictModel):
    status: Literal["analyzed", "uncertain"]
    emotions: list[EmotionEvidence] = Field(max_length=2)
    relationship: EmotionRelationship
    recommended_emotion: BaseEmotionKey | None
    objects: list[str] = Field(max_length=8)

    @model_validator(mode="after")
    def consistent(self):
        check_relationship(self.emotions, self.relationship)
        keys = [item.emotion for item in self.emotions]
        if self.status == "analyzed" and (not keys or self.recommended_emotion not in keys):
            raise ValueError("분석 결과에 포함된 감정을 추천해야 합니다.")
        if self.status == "uncertain" and self.recommended_emotion is not None:
            raise ValueError("불확실한 분석에는 대표 감정을 추천하지 않습니다.")
        if self.status == "analyzed":
            primary = next(item for item in self.emotions if item.emotion == self.recommended_emotion)
            secondaries = [item for item in self.emotions if item.emotion != self.recommended_emotion]
            if primary.relation is not None:
                raise ValueError("주감정에는 보조감정 관계를 지정할 수 없습니다.")
            if secondaries and secondaries[0].relation is None:
                raise ValueError("보조감정 관계를 지정해 주세요.")
        if self.relationship.type == RelationshipType.UNCERTAIN and self.status != "uncertain":
            raise ValueError("불확실한 관계에는 사용자 확인이 필요합니다.")
        if any(not item.strip() or len(item) > 60 for item in self.objects):
            raise ValueError("사물 키워드가 올바르지 않습니다.")
        return self

    def verify_source(self, text: str):
        for item in self.emotions:
            if item.evidence not in text:
                raise ValueError("분석 근거가 일기 원문에 없습니다.")
        # Conservative: only literal concrete object terms can drive props.
        if any(item not in text for item in self.objects):
            raise ValueError("사물 키워드가 원문에 없습니다.")
        return self


class ReviewedEmotion(StrictModel):
    emotion: BaseEmotionKey
    intensity: int = Field(ge=1, le=5, strict=True)
    source: Literal["ai", "user"]
    evidence: str | None = Field(default=None, max_length=2000)
    evidence_start: int | None = Field(default=None, ge=0)
    evidence_end: int | None = Field(default=None, ge=0)
    event: str = Field(default="", max_length=200)
    explanation: str = Field(default="사용자가 직접 선택한 감정입니다.", max_length=300)
    relation: SecondaryEmotionRelation | None = None


class EmotionReview(StrictModel):
    status: Literal["analyzed", "uncertain"]
    emotions: list[ReviewedEmotion] = Field(max_length=2)
    relationship: EmotionRelationship
    recommended_emotion: BaseEmotionKey | None
    selected_emotion: BaseEmotionKey | None
    objects: list[str] = Field(max_length=8)
    confirmed_by_user: bool = False

    @model_validator(mode="after")
    def consistent(self):
        check_relationship(self.emotions, self.relationship)
        keys = [item.emotion for item in self.emotions]
        if self.selected_emotion is not None and self.selected_emotion not in keys:
            raise ValueError("대표 감정은 현재 감정 중에서 선택해 주세요.")
        if self.recommended_emotion is not None and self.recommended_emotion not in keys:
            raise ValueError("추천 감정이 현재 감정에 없습니다.")
        if self.confirmed_by_user and self.selected_emotion is None:
            raise ValueError("캐릭터 생성에는 대표 감정 선택이 필요합니다.")
        return self


class ConfirmEmotionRequest(StrictModel):
    revision: int = Field(ge=1)
    selected_emotion: BaseEmotionKey
