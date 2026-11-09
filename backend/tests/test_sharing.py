from fastapi.testclient import TestClient

from tests.test_characters import authenticate, create_character


def test_owner_creates_reusable_share_link(client: TestClient) -> None:
    authenticate(client)
    character = create_character(client)

    first = client.post(f"/api/characters/{character['character_id']}/share")
    second = client.post(f"/api/characters/{character['character_id']}/share")

    assert first.status_code == 200
    assert first.json() == second.json()
    assert first.json()["share_path"] == f"/share/{first.json()['token']}"
    assert len(first.json()["token"]) >= 32


def test_public_share_never_exposes_the_diary(client: TestClient) -> None:
    authenticate(client, nickname="자랑꾼")
    character = create_character(client)
    token = client.post(f"/api/characters/{character['character_id']}/share").json()["token"]
    client.patch(f"/api/characters/{character['character_id']}/name", json={"name": "반짝이"})
    client.patch("/api/account/nickname", json={"nickname": "새닉네임"})
    client.post("/api/auth/logout")
    client.cookies.clear()

    shared = client.get(f"/api/shares/{token}")

    assert shared.status_code == 200
    body = shared.json()
    assert body["owner_nickname"] == "새닉네임"
    assert body["name"] == "반짝이"
    assert any(item["key"] == "joy" and item["is_primary"] for item in body["emotions"])
    assert body["relationship_type"]
    assert set(body) == {
        "owner_nickname", "name", "behavior_type",
        "accessory_part", "effect_parts", "appearance", "emotions", "relationship_type",
    }
    serialized = shared.text
    for private in ("collection@example.com", "친구와", "met_on", "user_id", "character_id", "diary_text", "evidence"):
        assert private not in serialized


def test_other_user_cannot_share_or_revoke(client: TestClient) -> None:
    authenticate(client)
    character = create_character(client)
    token = client.post(f"/api/characters/{character['character_id']}/share").json()["token"]
    client.post("/api/auth/logout")
    authenticate(client, email="other@example.com", nickname="남의사람")

    assert client.post(f"/api/characters/{character['character_id']}/share").status_code == 404
    assert client.delete(f"/api/characters/{character['character_id']}/share").status_code == 404
    assert client.get(f"/api/shares/{token}").status_code == 200


def test_revoked_link_stops_working_and_new_link_differs(client: TestClient) -> None:
    authenticate(client)
    character = create_character(client)
    url = f"/api/characters/{character['character_id']}/share"
    token = client.post(url).json()["token"]

    assert client.delete(url).status_code == 204
    expired = client.get(f"/api/shares/{token}")
    renewed = client.post(url).json()["token"]

    assert expired.status_code == 404
    assert expired.json()["detail"] == "공유가 끝났거나 찾을 수 없는 링크예요."
    assert renewed != token
    assert client.get(f"/api/shares/{renewed}").status_code == 200


def test_deleting_last_encounter_disables_share(client: TestClient) -> None:
    authenticate(client)
    character = create_character(client)
    token = client.post(f"/api/characters/{character['character_id']}/share").json()["token"]

    deleted = client.delete(
        f"/api/characters/{character['character_id']}/encounters/{character['encounter_id']}"
    )

    assert deleted.status_code == 204
    assert client.get(f"/api/shares/{token}").status_code == 404


def test_unknown_token_returns_generic_message(client: TestClient) -> None:
    response = client.get("/api/shares/not-a-real-token")

    assert response.status_code == 404
    assert response.json()["detail"] == "공유가 끝났거나 찾을 수 없는 링크예요."
