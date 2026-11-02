from datetime import date

from pydantic import BaseModel, field_validator

from app.schemas.emotions import BaseEmotionKey, EmotionAnalysisResponse


class CharacterAppearance(BaseModel):
    body_part: str
    palette: str
    color: str
    eyebrow_part: str
    eye_part: str
    mouth_part: str
    mutation_part: str | None


class CharacterResult(BaseModel):
    character_id: str
    encounter_id: str
    name: str
    fingerprint: str
    primary_emotion: BaseEmotionKey
    intensity_level: int
    behavior_type: str
    accessory_part: str | None
    effect_parts: list[str]
    feature_description: str
    is_new_character: bool
    appearance: CharacterAppearance


class CharacterCard(BaseModel):
    character_id: str
    name: str
    primary_emotion: BaseEmotionKey
    behavior_type: str
    is_resident: bool
    encounter_count: int
    first_met_on: date
    last_met_on: date
    appearance: CharacterAppearance


class EncounterSummary(BaseModel):
    encounter_id: str
    met_on: date
    intensity_level: int
    accessory_part: str | None
    effect_parts: list[str]


class CharacterDetail(BaseModel):
    character: CharacterCard
    encounters: list[EncounterSummary]


class EncounterDetail(BaseModel):
    encounter_id: str
    met_on: date
    title: str | None
    diary_text: str
    analysis: EmotionAnalysisResponse
    character: CharacterResult


class CharacterNameUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not 1 <= len(name) <= 12:
            raise ValueError("캐릭터 이름은 1~12자로 입력해 주세요.")
        return name
