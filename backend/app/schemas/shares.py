from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.emotions import BaseEmotionKey



class PublicCharacterAppearance(BaseModel):
    """Visual data required to reproduce the shared character."""

    body_part: str
    palette: str
    color: str
    eyebrow_part: str
    eye_part: str
    mouth_part: str
    mutation_part: str | None
    renderer_version: str | None = None
    render_spec: "PublicCharacterRenderSpec | None" = None


class PublicCharacterRenderSpec(BaseModel):
    renderer_version: str
    seed: int
    primary_emotion: str
    primary_intensity: int
    secondary_emotion: str | None
    secondary_intensity: int
    secondary_relation: str | None = None
    silhouette_id: str
    decoration_id: str | None
    animal_feature_id: str | None = None


PublicCharacterAppearance.model_rebuild()


class ShareLink(BaseModel):
    token: str
    share_path: str


class PublicEmotion(BaseModel):
    key: BaseEmotionKey
    label: str
    intensity: int | None = Field(default=None, ge=1, le=5)
    is_primary: bool = False


class PublicSharedCharacter(BaseModel):
    """Character plus concise, confirmed emotion labels; never diary text or evidence."""

    owner_nickname: str
    name: str
    behavior_type: str
    accessory_part: str | None
    effect_parts: list[str]
    appearance: PublicCharacterAppearance
    emotions: list[PublicEmotion] = Field(default_factory=list)
    relationship_type: str | None = None
