from pathlib import Path

from fastapi.testclient import TestClient

from app.constants.shop import FURNITURE_CATALOG, SHOP_CATEGORIES
from app.models import User

from tests.test_characters import authenticate, create_character


def test_new_user_starts_with_no_coins_and_empty_room(client: TestClient) -> None:
    authenticate(client)

    shop = client.get("/api/shop")

    assert shop.status_code == 200
    assert shop.json()["coins"] == 0
    assert len(shop.json()["items"]) == 24
    assert [c["category_id"] for c in shop.json()["categories"]] == [
        "wall", "window", "furniture", "props", "floor",
    ]
    assert not any(item["owned"] or item["placed"] for item in shop.json()["items"])


def test_diary_with_new_character_awards_coins(client: TestClient) -> None:
    authenticate(client)
    create_character(client)

    assert client.get("/api/shop").json()["coins"] == 150


def test_purchase_places_item_and_spends_coins(client: TestClient) -> None:
    authenticate(client)
    create_character(client)

    bought = client.post("/api/shop/curtains/purchase")

    assert bought.status_code == 200
    assert bought.json()["coins"] == 50
    curtains = next(item for item in bought.json()["items"] if item["item_id"] == "curtains")
    assert curtains["owned"] and curtains["placed"]
    assert client.post("/api/shop/curtains/purchase").status_code == 409


def test_cannot_buy_without_enough_coins(client: TestClient) -> None:
    authenticate(client)

    response = client.post("/api/shop/bed/purchase")

    assert response.status_code == 400
    assert "코인이 부족" in response.json()["detail"]
    assert client.post("/api/shop/spaceship/purchase").status_code == 404


def test_owned_item_can_be_put_away_and_placed_again(client: TestClient) -> None:
    authenticate(client)
    create_character(client)
    client.post("/api/shop/picture/purchase")

    stored = client.patch("/api/shop/picture/placement", json={"placed": False})
    placed = client.patch("/api/shop/picture/placement", json={"placed": True})

    assert next(i for i in stored.json()["items"] if i["item_id"] == "picture")["placed"] is False
    assert next(i for i in placed.json()["items"] if i["item_id"] == "picture")["placed"] is True
    assert client.patch("/api/shop/bed/placement", json={"placed": True}).status_code == 404


def test_furniture_belongs_to_each_user(client: TestClient) -> None:
    authenticate(client)
    create_character(client)
    client.post("/api/shop/plant/purchase")
    client.post("/api/auth/logout")
    authenticate(client, email="other@example.com", nickname="이웃")

    plant = next(i for i in client.get("/api/shop").json()["items"] if i["item_id"] == "plant")

    assert plant["owned"] is False


def test_shop_requires_login(client: TestClient) -> None:
    assert client.get("/api/shop").status_code == 401


def test_only_one_item_per_slot_is_placed(client: TestClient, db_session) -> None:
    authenticate(client)
    user = db_session.query(User).one()
    user.coins = 1000
    db_session.commit()

    client.post("/api/shop/curtains/purchase")
    after_second = client.post("/api/shop/blinds/purchase").json()["items"]
    placed = {i["item_id"] for i in after_second if i["placed"]}
    assert placed == {"blinds"}

    swapped = client.patch("/api/shop/curtains/placement", json={"placed": True}).json()["items"]
    assert {i["item_id"] for i in swapped if i["placed"]} == {"curtains"}


def test_every_catalog_item_has_category_and_images() -> None:
    assets = Path(__file__).resolve().parents[2] / "frontend/public/assets/room/furniture"
    for item_id, item in FURNITURE_CATALOG.items():
        assert item["category"] in SHOP_CATEGORIES
        assert (assets / f"{item_id}.png").is_file(), item_id
        assert (assets / "icons" / f"{item_id}.png").is_file(), item_id
