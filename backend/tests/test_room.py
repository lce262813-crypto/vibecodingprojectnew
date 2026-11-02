from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Character, DailyEntry, Encounter, User


def authenticate(
    client: TestClient,
    email: str = "room@example.com",
    nickname: str = "방친구",
) -> None:
    assert client.post(
        "/api/auth/signup",
        json={"email": email, "password": "safe-password", "nickname": nickname},
    ).status_code == 201
    assert client.post(
        "/api/auth/login",
        json={"email": email, "password": "safe-password"},
    ).status_code == 200


def seed_characters(db: Session, user: User, count: int) -> list[Character]:
    characters: list[Character] = []
    for index in range(count):
        entry = DailyEntry(
            user_id=user.id,
            entry_date=date(2026, 10, index + 1),
            diary_text=f"방 테스트를 위한 {index + 1}번째 충분히 긴 일기입니다.",
            status="completed",
        )
        character = Character(
            user_id=user.id,
            fingerprint=f"joy:4:none:none:{index + 1}",
            algorithm_version="v1",
            seed=str(index).zfill(64),
            name=f"방친구{index + 1}",
            body_part="round",
            palette="sunny",
            eyebrow_part="brow_soft",
            eye_part="eye_smile",
            mouth_part="mouth_laugh",
            mutation_part=None,
            behavior_type="active",
        )
        db.add_all([entry, character])
        db.flush()
        db.add(
            Encounter(
                character_id=character.id,
                daily_entry_id=entry.id,
                intensity_level=4,
                accessory_part=None,
                effect_parts=["sparkles"],
                dialogue_group="joy",
                met_on=entry.entry_date,
            )
        )
        characters.append(character)
    db.commit()
    return characters


def test_room_enforces_five_resident_limit(
    client: TestClient, db_session: Session
) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "room@example.com"))
    assert user is not None
    characters = seed_characters(db_session, user, 6)

    for character in characters[:5]:
        response = client.put(f"/api/room/residents/{character.id}")
        assert response.status_code == 200

    full = client.get("/api/room/residents")
    rejected = client.put(f"/api/room/residents/{characters[5].id}")

    assert full.json()["count"] == 5
    assert full.json()["limit"] == 5
    assert rejected.status_code == 409
    assert len(full.json()["residents"][0]["dialogue_lines"]) == 2

    moved_out = client.delete(f"/api/room/residents/{characters[0].id}")
    moved_in = client.put(f"/api/room/residents/{characters[5].id}")
    assert moved_out.json()["count"] == 4
    assert moved_in.json()["count"] == 5


def test_move_in_is_idempotent(client: TestClient, db_session: Session) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "room@example.com"))
    assert user is not None
    character = seed_characters(db_session, user, 1)[0]

    first = client.put(f"/api/room/residents/{character.id}")
    second = client.put(f"/api/room/residents/{character.id}")

    assert first.json()["count"] == 1
    assert second.json()["count"] == 1


def test_user_cannot_move_in_another_users_character(
    client: TestClient, db_session: Session
) -> None:
    authenticate(client)
    owner = db_session.scalar(select(User).where(User.email == "room@example.com"))
    assert owner is not None
    character = seed_characters(db_session, owner, 1)[0]
    client.post("/api/auth/logout")
    authenticate(client, "other-room@example.com", "다른방친구")

    assert client.put(f"/api/room/residents/{character.id}").status_code == 404
