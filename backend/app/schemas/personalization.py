from pydantic import BaseModel, Field


class BadgeStatus(BaseModel):
    badge_id: str
    name: str
    description: str
    earned: bool
    progress: int = Field(ge=0)
    target: int = Field(ge=1)


class BadgeListResponse(BaseModel):
    badges: list[BadgeStatus]
