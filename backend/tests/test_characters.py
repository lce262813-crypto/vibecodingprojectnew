from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import EmotionAnalysis, Encounter
from tests.review_helpers import confirm_entry


def authenticate(
    client: TestClient,
    email: str = "collection@example.com",
    nickname: str = "도감친구",
) -> None:
    assert client.post(
        "/api/auth/signup",
        json={"email": email, "password": "safe-password", "nickname": nickname},
    ).status_code == 201
    assert client.post(
        "/api/auth/login",
        json={"email": email, "password": "safe-password"},
    ).status_code == 200


def create_character(client: TestClient) -> dict:
    response = client.post(
        "/api/diary/today",
        json={
            "title": "친구와 웃었던 날",
            "diary_text": "친구와 즐거운 시간을 보내서 정말 기쁘고 설렜다.",
        },
    )
    assert response.status_code == 201
    return confirm_entry(client, response.json()).json()["character"]


def test_collection_detail_name_and_encounter_flow(client: TestClient) -> None:
    authenticate(client)
    result = create_character(client)

    collection = client.get("/api/characters")
    detail = client.get(f"/api/characters/{result['character_id']}")

    assert collection.status_code == 200
    assert len(collection.json()) == 1
    assert collection.json()[0]["encounter_count"] == 1
    assert collection.json()[0]["is_favorite"] is False
    assert detail.status_code == 200
    assert detail.json()["encounters"][0]["encounter_id"] == result["encounter_id"]
    assert detail.json()["encounters"][0]["entry_id"]
    assert detail.json()["encounters"][0]["display_emotions"]

    renamed = client.patch(
        f"/api/characters/{result['character_id']}/name",
        json={"name": "  나의몽글이  "},
    )
    encounter = client.get(
        f"/api/characters/{result['character_id']}/encounters/{result['encounter_id']}"
    )

    assert renamed.status_code == 200
    assert renamed.json()["character"]["name"] == "나의몽글이"
    assert encounter.status_code == 200
    assert encounter.json()["title"] == "친구와 웃었던 날"
    assert encounter.json()["diary_text"].startswith("친구와")
    assert encounter.json()["analysis"]["primary_emotion"] == "joy"
    assert encounter.json()["character"]["character_id"] == result["character_id"]
    assert encounter.json()["character"]["encounter_id"] == result["encounter_id"]


def test_other_user_cannot_access_private_character(client: TestClient) -> None:
    authenticate(client)
    result = create_character(client)
    assert client.post("/api/auth/logout").status_code == 204

    authenticate(client, "stranger@example.com", "다른친구")

    assert client.get(f"/api/characters/{result['character_id']}").status_code == 404
    assert client.patch(
        f"/api/characters/{result['character_id']}/name", json={"name": "침입"}
    ).status_code == 404
    assert client.patch(
        f"/api/characters/{result['character_id']}/favorite",
        json={"is_favorite": True},
    ).status_code == 404


def test_favorite_persists_in_collection(client: TestClient) -> None:
    authenticate(client)
    result = create_character(client)

    updated = client.patch(
        f"/api/characters/{result['character_id']}/favorite",
        json={"is_favorite": True},
    )

    assert updated.status_code == 200
    assert updated.json()["character"]["is_favorite"] is True
    assert client.get("/api/characters").json()[0]["is_favorite"] is True


def test_deleting_last_encounter_keeps_daily_tombstone(client: TestClient) -> None:
    authenticate(client)
    result = create_character(client)

    deleted = client.delete(
        f"/api/characters/{result['character_id']}/encounters/{result['encounter_id']}"
    )

    assert deleted.status_code == 204
    assert client.get("/api/characters").json() == []
    today = client.get("/api/diary/today").json()
    assert today["status"] == "deleted"
    assert today["diary_text"] is None
    assert today["analysis"] is None
    assert today["character"] is None

    retry = client.post(
        "/api/diary/today",
        json={"diary_text": "삭제 후 다시 작성하려는 충분히 긴 일기입니다."},
    )
    assert retry.status_code == 200
    assert retry.json()["status"] == "deleted"


def test_character_name_length_is_validated(client: TestClient) -> None:
    authenticate(client)
    result = create_character(client)

    assert client.patch(
        f"/api/characters/{result['character_id']}/name", json={"name": " "}
    ).status_code == 422
    assert client.patch(
        f"/api/characters/{result['character_id']}/name", json={"name": "가" * 13}
    ).status_code == 422


def test_item_comes_from_the_saved_analysis_without_changing_the_record(client: TestClient, db_session) -> None:
    authenticate(client)
    character_id = create_character(client)["character_id"]
    analysis = db_session.scalar(select(EmotionAnalysis))
    encounter = db_session.scalar(select(Encounter))
    analysis.objects = ["맥주"]
    db_session.commit()

    detail = client.get(f"/api/characters/{character_id}").json()
    assert detail["encounters"][0]["accessory_part"] == "beer"
    assert detail["character"]["appearance"]["render_spec"]["decoration_id"] == "beer"
    assert client.get("/api/characters").json()[0]["appearance"]["render_spec"]["decoration_id"] == "beer"

    db_session.refresh(encounter)
    assert encounter.accessory_part is None
