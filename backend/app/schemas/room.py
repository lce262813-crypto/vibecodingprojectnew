from pydantic import BaseModel

from app.schemas.characters import CharacterCard


class RoomResident(BaseModel):
    character: CharacterCard
    intensity_level: int
    accessory_part: str | None
    effect_parts: list[str]
    dialogue_lines: list[str]


class ResidentListResponse(BaseModel):
    residents: list[RoomResident]
    count: int
    limit: int = 5
