from pathlib import Path

from fastapi.testclient import TestClient
from tests.review_helpers import confirm_entry


def authenticate(client: TestClient, email: str = "personal@example.com") -> None:
    nickname = email.split("@")[0].replace("-", "_")
    assert client.post("/api/auth/signup", json={"email": email, "password": "safe-password", "nickname": nickname}).status_code == 201
    assert client.post("/api/auth/login", json={"email": email, "password": "safe-password"}).status_code == 200


def private_media(monkeypatch, tmp_path: Path) -> None:
    def directory(kind: str) -> Path:
        value = tmp_path / kind
        value.mkdir(parents=True, exist_ok=True)
        return value
    monkeypatch.setattr("app.services.media.media_directory", directory)


def test_profile_preferences_avatar_and_representative_character(
    client: TestClient, monkeypatch, tmp_path: Path
) -> None:
    private_media(monkeypatch, tmp_path)
    authenticate(client)
    created = client.post("/api/diary/today", json={"diary_text": "\uC624\uB298\uC740 \uC815\uB9D0 \uD589\uBCF5\uD588\uB2E4. \uCE5C\uAD6C\uC640 \uC990\uAC70\uC6E0\uB2E4."})
    created = confirm_entry(client, created.json())
    character_id = created.json()["character"]["character_id"]
    preferences = client.patch("/api/account/preferences", json={
        "representative_character_id": character_id,
        "theme": "lavender",
        "notifications_enabled": True,
        "notification_time": "20:30",
        "room_background": "night",
    })
    assert preferences.status_code == 200
    assert preferences.json()["representative_character_id"] == character_id
    assert preferences.json()["theme"] == "lavender"

    image = b"\x89PNG\r\n\x1a\nprofile"
    uploaded = client.put("/api/account/avatar", content=image, headers={"Content-Type": "image/png"})
    assert uploaded.status_code == 200
    assert uploaded.json()["avatar_url"] == "/api/account/avatar"
    assert client.get("/api/account/avatar").content == image
    assert client.delete("/api/account/avatar").json()["avatar_url"] is None


def test_invalid_image_and_foreign_representative_are_rejected(
    client: TestClient, monkeypatch, tmp_path: Path
) -> None:
    private_media(monkeypatch, tmp_path)
    authenticate(client)
    assert client.put("/api/account/avatar", content=b"not-image", headers={"Content-Type": "image/png"}).status_code == 422
    payload = {"representative_character_id": "missing", "theme": "cream", "notifications_enabled": False, "notification_time": "21:00", "room_background": "cream"}
    assert client.patch("/api/account/preferences", json=payload).status_code == 404


def test_diary_photo_is_private_replaceable_and_removable(
    client: TestClient, monkeypatch, tmp_path: Path
) -> None:
    private_media(monkeypatch, tmp_path)
    authenticate(client)
    created = client.post("/api/diary/today", json={"diary_text": "사진과 함께 남기는 충분히 긴 일기입니다."}).json()
    entry_id = created["entry_id"]
    image = b"\xff\xd8\xffphoto"
    uploaded = client.put(f"/api/diary/entries/{entry_id}/photo", content=image, headers={"Content-Type": "image/jpeg"})
    assert uploaded.status_code == 200
    assert uploaded.json()["photo_url"].endswith("/photo")
    assert client.get(f"/api/diary/entries/{entry_id}/photo").content == image
    removed = client.delete(f"/api/diary/entries/{entry_id}/photo")
    assert removed.status_code == 200
    assert removed.json()["photo_url"] is None
    assert client.get(f"/api/diary/entries/{entry_id}/photo").status_code == 404
    assert client.put(f"/api/diary/entries/{entry_id}/photo", content=image, headers={"Content-Type": "image/jpeg"}).status_code == 200

    assert client.post("/api/auth/logout").status_code == 204
    authenticate(client, "other-personal@example.com")
    assert client.get(f"/api/diary/entries/{entry_id}/photo").status_code == 404


def test_badges_report_progress_without_judging_emotion(client: TestClient) -> None:
    authenticate(client)
    before = client.get("/api/account/badges")
    assert before.status_code == 200
    assert all(not item["earned"] for item in before.json()["badges"])
    client.post("/api/diary/today", json={"diary_text": "어떤 감정이든 그대로 기록하는 충분히 긴 일기입니다."})
    confirm_entry(client, client.get("/api/diary/today").json())
    after = client.get("/api/account/badges").json()["badges"]
    assert next(item for item in after if item["badge_id"] == "first_diary")["earned"] is True
