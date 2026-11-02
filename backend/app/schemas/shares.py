from pydantic import BaseModel

from app.schemas.characters import CharacterAppearance


class ShareLink(BaseModel):
    token: str
    share_path: str


class PublicSharedCharacter(BaseModel):
    """Only the character and the owner's current nickname are public."""

    owner_nickname: str
    name: str
    behavior_type: str
    accessory_part: str | None
    effect_parts: list[str]
    appearance: CharacterAppearance
