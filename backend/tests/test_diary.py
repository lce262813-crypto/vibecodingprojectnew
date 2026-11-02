from fastapi.testclient import TestClient

from app.services.clock import today_in_seoul


def create_authenticated_client(
    client: TestClient,
    email: str = "diary@example.com",
    nickname: str = "일기친구",
) -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "password": "safe-password",
            "nickname": nickname,
        },
    )
    assert signup.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "safe-password"},
    )
    assert login.status_code == 200


def test_today_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/diary/today").status_code == 401
    assert (
        client.post(
            "/api/diary/today", json={"diary_text": "오늘의 충분히 긴 일기입니다."}
        ).status_code
        == 401
    )


def test_today_starts_empty_and_uses_seoul_date(client: TestClient) -> None:
    create_authenticated_client(client)

    response = client.get("/api/diary/today")

    assert response.status_code == 200
    assert response.json() == {
        "status": "not_started",
        "entry_date": today_in_seoul().isoformat(),
        "entry_id": None,
        "title": None,
        "diary_text": None,
        "analysis": None,
        "character": None,
    }


def test_create_today_trims_and_locks_original_text(client: TestClient) -> None:
    create_authenticated_client(client)

    first = client.post(
        "/api/diary/today",
        json={
            "title": "  산책하기 좋은 날  ",
            "diary_text": "   오늘은 친구와 산책해서 기분이 좋았다.   ",
        },
    )
    second = client.post(
        "/api/diary/today",
        json={"title": "바꾸려는 제목", "diary_text": "완전히 다른 내용으로 다시 제출해 본다."},
    )

    assert first.status_code == 201
    assert first.json()["status"] == "completed"
    assert first.json()["analysis"]["analysis_mode"] == "live"
    assert first.json()["character"]["name"]
    assert first.json()["character"]["is_new_character"] is True
    assert first.json()["character"]["appearance"]["body_part"]
    assert first.json()["title"] == "산책하기 좋은 날"
    assert first.json()["diary_text"] == "오늘은 친구와 산책해서 기분이 좋았다."
    assert second.status_code == 200
    assert second.json()["entry_id"] == first.json()["entry_id"]
    assert second.json()["title"] == first.json()["title"]
    assert second.json()["diary_text"] == first.json()["diary_text"]


def test_diary_length_boundaries(client: TestClient) -> None:
    create_authenticated_client(client)

    assert (
        client.post("/api/diary/today", json={"diary_text": "가" * 9}).status_code
        == 422
    )
    assert (
        client.post("/api/diary/today", json={"diary_text": "가" * 2001}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/diary/today",
            json={"title": "제" * 101, "diary_text": "가" * 10},
        ).status_code
        == 422
    )
    assert (
        client.post("/api/diary/today", json={"diary_text": "가" * 10}).status_code
        == 201
    )


def test_each_user_has_an_independent_daily_entry(client: TestClient) -> None:
    create_authenticated_client(client)
    first = client.post(
        "/api/diary/today", json={"diary_text": "첫 번째 사용자의 오늘 일기입니다."}
    )
    assert first.status_code == 201
    assert client.post("/api/auth/logout").status_code == 204

    create_authenticated_client(
        client, email="other-diary@example.com", nickname="다른친구"
    )
    empty = client.get("/api/diary/today")
    second = client.post(
        "/api/diary/today", json={"diary_text": "두 번째 사용자의 오늘 일기입니다."}
    )

    assert empty.json()["status"] == "not_started"
    assert second.status_code == 201
    assert second.json()["entry_id"] != first.json()["entry_id"]


def test_saved_demo_result_can_be_upgraded_to_live_analysis(
    client: TestClient, fake_analyzer
) -> None:
    create_authenticated_client(client)
    fake_analyzer.should_fail = True
    created = client.post(
        "/api/diary/today",
        json={"diary_text": "오늘 너무 졸린 것 같다. 너무 졸리다."},
    )
    assert created.json()["status"] == "ai_failed"

    demo = client.post("/api/diary/today/demo")
    assert demo.status_code == 200
    assert demo.json()["analysis"]["analysis_mode"] == "demo"
    old_encounter_id = demo.json()["character"]["encounter_id"]

    fake_analyzer.should_fail = False
    upgraded = client.post("/api/diary/today/retry")

    assert upgraded.status_code == 200
    assert upgraded.json()["status"] == "completed"
    assert upgraded.json()["analysis"]["analysis_mode"] == "live"
    assert upgraded.json()["diary_text"] == "오늘 너무 졸린 것 같다. 너무 졸리다."
    assert upgraded.json()["character"]["encounter_id"] != old_encounter_id


def test_monthly_calendar_returns_only_the_signed_in_users_saved_character(
    client: TestClient,
) -> None:
    today = today_in_seoul()
    create_authenticated_client(client)
    created = client.post(
        "/api/diary/today",
        json={"title": "오늘의 기록", "diary_text": "친구와 산책해서 즐거웠던 오늘의 일기입니다."},
    )
    assert created.status_code == 201

    calendar = client.get(
        f"/api/diary/records?year={today.year}&month={today.month}"
    )

    assert calendar.status_code == 200
    assert calendar.json()["year"] == today.year
    assert calendar.json()["month"] == today.month
    assert len(calendar.json()["records"]) == 1
    record = calendar.json()["records"][0]
    assert record["entry_date"] == today.isoformat()
    assert record["title"] == "오늘의 기록"
    assert record["character"]["character_id"] == created.json()["character"]["character_id"]
    assert record["character"]["encounter_id"] == created.json()["character"]["encounter_id"]

    assert client.post("/api/auth/logout").status_code == 204
    create_authenticated_client(
        client, email="calendar-other@example.com", nickname="달력다른이"
    )
    other_calendar = client.get(
        f"/api/diary/records?year={today.year}&month={today.month}"
    )
    assert other_calendar.status_code == 200
    assert other_calendar.json()["records"] == []


def test_monthly_calendar_validates_year_and_month(client: TestClient) -> None:
    create_authenticated_client(client)
    assert client.get("/api/diary/records?year=2026&month=0").status_code == 422
    assert client.get("/api/diary/records?year=1999&month=1").status_code == 422
