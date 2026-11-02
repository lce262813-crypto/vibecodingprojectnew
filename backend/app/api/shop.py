from fastapi import APIRouter, HTTPException

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.shop import PlacementUpdate, ShopResponse
from app.services.shop import ShopError, purchase, set_placement, shop_for

router = APIRouter(prefix="/api/shop", tags=["shop"])


@router.get("", response_model=ShopResponse)
def get_shop(user: CurrentUser, db: DatabaseSession) -> ShopResponse:
    return shop_for(db, user)


@router.post("/{item_id}/purchase", response_model=ShopResponse)
def buy_item(item_id: str, user: CurrentUser, db: DatabaseSession) -> ShopResponse:
    try:
        return purchase(db, user, item_id)
    except ShopError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error


@router.patch("/{item_id}/placement", response_model=ShopResponse)
def place_item(
    item_id: str, payload: PlacementUpdate, user: CurrentUser, db: DatabaseSession
) -> ShopResponse:
    try:
        return set_placement(db, user, item_id, payload.placed)
    except ShopError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error
