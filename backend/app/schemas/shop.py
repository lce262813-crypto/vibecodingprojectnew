from pydantic import BaseModel


class ShopItem(BaseModel):
    item_id: str
    name: str
    description: str
    price: int
    category: str
    slot: str
    owned: bool
    placed: bool


class ShopCategory(BaseModel):
    category_id: str
    name: str


class ShopResponse(BaseModel):
    coins: int
    categories: list[ShopCategory]
    items: list[ShopItem]


class PlacementUpdate(BaseModel):
    placed: bool
