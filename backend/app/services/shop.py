from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.shop import (
    DIARY_REWARD_COINS,
    FURNITURE_CATALOG,
    NEW_CHARACTER_BONUS_COINS,
    SHOP_CATEGORIES,
)
from app.models import OwnedFurniture, User
from app.schemas.shop import ShopCategory, ShopItem, ShopResponse


class ShopError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def award_diary_coins(db: Session, user_id: str, is_new_character: bool) -> None:
    user = db.get(User, user_id)
    if user is None:
        return
    reward = DIARY_REWARD_COINS + (NEW_CHARACTER_BONUS_COINS if is_new_character else 0)
    user.coins = (user.coins or 0) + reward


def owned_furniture(db: Session, user: User) -> dict[str, OwnedFurniture]:
    rows = db.scalars(select(OwnedFurniture).where(OwnedFurniture.user_id == user.id))
    return {row.item_id: row for row in rows}


def clear_slot(db: Session, user: User, item_id: str) -> None:
    """Put away whatever already occupies the item's fixed spot in the room."""
    slot = FURNITURE_CATALOG[item_id]["slot"]
    for other_id, furniture in owned_furniture(db, user).items():
        if other_id != item_id and FURNITURE_CATALOG.get(other_id, {}).get("slot") == slot:
            furniture.is_placed = False


def shop_for(db: Session, user: User) -> ShopResponse:
    owned = owned_furniture(db, user)
    return ShopResponse(
        coins=user.coins,
        categories=[
            ShopCategory(category_id=category_id, name=name)
            for category_id, name in SHOP_CATEGORIES.items()
        ],
        items=[
            ShopItem(
                item_id=item_id,
                name=str(item["name"]),
                description=str(item["description"]),
                price=int(item["price"]),
                category=str(item["category"]),
                slot=str(item["slot"]),
                owned=item_id in owned,
                placed=item_id in owned and owned[item_id].is_placed,
            )
            for item_id, item in FURNITURE_CATALOG.items()
        ],
    )


def purchase(db: Session, user: User, item_id: str) -> ShopResponse:
    item = FURNITURE_CATALOG.get(item_id)
    if item is None:
        raise ShopError(404, "상점에 없는 가구예요.")
    if item_id in owned_furniture(db, user):
        raise ShopError(409, "이미 가지고 있는 가구예요.")
    price = int(item["price"])
    if user.coins < price:
        raise ShopError(400, "코인이 부족해요. 일기를 쓰면 코인을 받을 수 있어요.")
    user.coins -= price
    clear_slot(db, user, item_id)
    db.add(OwnedFurniture(user_id=user.id, item_id=item_id, is_placed=True))
    db.commit()
    return shop_for(db, user)


def set_placement(db: Session, user: User, item_id: str, placed: bool) -> ShopResponse:
    furniture = owned_furniture(db, user).get(item_id)
    if furniture is None:
        raise ShopError(404, "가지고 있지 않은 가구예요.")
    if placed:
        clear_slot(db, user, item_id)
    furniture.is_placed = placed
    db.commit()
    return shop_for(db, user)
