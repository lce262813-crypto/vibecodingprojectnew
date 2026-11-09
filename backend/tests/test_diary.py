from datetime import timedelta

from fastapi.testclient import TestClient
from tests.review_helpers import confirm_entry

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


def test_only_presentation_account_can_replace_today_entry(client: TestClient) -> None:
    create_authenticated_client(client, email="regular@example.com", nickname="일반")
    assert client.get("/api/auth/me").json()["is_demo_account"] is False
    rejected = client.post("/api/diary/today/demo-rewrite", json={"diary_text": "새 기록을 저장할 수 있는지 확인합니다."})
    assert rejected.status_code == 403
    assert client.get("/api/diary/today").json()["status"] == "not_started"


def test_presentation_account_can_replace_only_its_today_entry(client: TestClient) -> None:
    create_authenticated_client(client, email="presentation@mozi-demo.com", nickname="발표")
    assert client.get("/api/auth/me").json()["is_demo_account"] is True
    original = client.post("/api/diary/today", json={
        "title": "처음 기록", "diary_text": "오늘은 친구와 산책하며 즐거운 시간을 보냈어요."
    }).json()

    replaced = client.post("/api/diary/today/demo-rewrite", json={
        "title": "다시 쓴 기록", "diary_text": "오늘은 집에서 쉬면서 마음이 한결 편안했어요."
    })

    assert replaced.status_code == 200
    assert replaced.json()["entry_id"] == original["entry_id"]
    assert replaced.json()["title"] == "다시 쓴 기록"
    assert replaced.json()["diary_text"] == "오늘은 집에서 쉬면서 마음이 한결 편안했어요."
    assert replaced.json()["status"] == "completed"
    records = client.get(f"/api/diary/records?year={today_in_seoul().year}&month={today_in_seoul().month}").json()["records"]
    assert len(records) == 1
    assert records[0]["title"] == "다시 쓴 기록"


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
        "photo_url": None,
        "analysis_error": None,
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
    assert first.json()["character"] is not None
    first = confirm_entry(client, first.json())
    assert first.json()["status"] == "completed"
    assert first.json()["analysis"]["analysis_mode"] == "live"
    assert first.json()["character"]["name"]
    assert first.json()["character"]["is_new_character"] is True
    assert first.json()["character"]["appearance"]["body_part"]
    assert first.json()["character"]["appearance"]["renderer_version"] == "human-review-v1"
    render_spec = first.json()["character"]["appearance"]["render_spec"]
    assert render_spec["silhouette_id"] in {"round", "heart", "flat", "wave", "spiky", "drop"}
    assert render_spec["primary_emotion"] == first.json()["analysis"]["primary_emotion"]
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


def test_confirmed_demo_result_is_not_regenerated(
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
    demo = confirm_entry(client, demo.json())
    old_encounter_id = demo.json()["character"]["encounter_id"]

    fake_analyzer.should_fail = False
    upgraded = client.post("/api/diary/today/retry")

    assert upgraded.status_code == 200
    assert upgraded.json()["status"] == "completed"
    assert upgraded.json()["analysis"]["analysis_mode"] == "demo"
    assert upgraded.json()["diary_text"] == "오늘 너무 졸린 것 같다. 너무 졸리다."
    assert upgraded.json()["character"]["encounter_id"] == old_encounter_id


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

    created = confirm_entry(client, created.json())
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


def test_draft_is_restored_and_finalized_for_today(client: TestClient) -> None:
    create_authenticated_client(client)
    entry_date = today_in_seoul()

    saved = client.put(
        "/api/diary/draft",
        json={
            "entry_date": entry_date.isoformat(),
            "title": "임시 제목",
            "diary_text": "아직 작성 중인 내용",
        },
    )
    restored = client.get(
        f"/api/diary/by-date?entry_date={entry_date.isoformat()}"
    )
    finalized = client.post(
        "/api/diary/entries",
        json={
            "entry_date": entry_date.isoformat(),
            "title": "완성한 제목",
            "diary_text": "친구와 산책을 하며 즐거웠던 오늘 하루를 기록한다.",
        },
    )

    assert saved.status_code == 200
    assert saved.json()["status"] == "draft"
    assert restored.json()["diary_text"] == "아직 작성 중인 내용"
    assert finalized.status_code == 201
    assert finalized.json()["status"] == "completed"
    assert finalized.json()["entry_id"] == saved.json()["entry_id"]
    assert finalized.json()["entry_date"] == entry_date.isoformat()


def test_written_diary_text_cannot_be_edited(client: TestClient) -> None:
    create_authenticated_client(client)
    created = client.post(
        "/api/diary/today",
        json={"title": "수정 전", "diary_text": "오늘은 친구를 만나서 정말 즐겁고 행복한 하루였다."},
    ).json()

    updated = client.patch(
        f"/api/diary/entries/{created['entry_id']}",
        json={"title": "수정 후", "diary_text": "한 번 쓴 일기는 다시 고쳐 쓸 수 없어야 한다."},
    )

    assert updated.status_code == 409
    kept = client.get(f"/api/diary/entries/{created['entry_id']}").json()
    assert kept["title"] == "수정 전"
    assert kept["character"] is not None
    assert kept["diary_text"] == created["diary_text"]


def test_search_and_entry_crud_are_scoped_to_current_user(client: TestClient) -> None:
    create_authenticated_client(client)
    created = client.post(
        "/api/diary/today",
        json={"title": "바다 여행", "diary_text": "바닷가에서 파도를 보며 마음이 평온해졌다."},
    ).json()
    entry_id = created["entry_id"]

    found = client.get("/api/diary/search?query=파도")
    assert found.status_code == 200
    assert [item["entry_id"] for item in found.json()["records"]] == [entry_id]

    client.post("/api/auth/logout")
    create_authenticated_client(client, "private-other@example.com", "비공개친구")
    assert client.get(f"/api/diary/entries/{entry_id}").status_code == 404
    assert client.patch(
        f"/api/diary/entries/{entry_id}",
        json={"title": "침범", "diary_text": "다른 사용자의 일기를 바꾸려고 시도한다."},
    ).status_code == 404
    assert client.delete(f"/api/diary/entries/{entry_id}").status_code == 404
    assert client.get("/api/diary/search?query=파도").json()["records"] == []


def test_delete_final_entry_removes_content_and_blocks_recreation(client: TestClient) -> None:
    create_authenticated_client(client)
    created = client.post(
        "/api/diary/today",
        json={"title": "삭제할 일기", "diary_text": "삭제 정책을 확인하기 위한 충분히 긴 일기 내용이다."},
    ).json()
    entry_id = created["entry_id"]

    assert client.delete(f"/api/diary/entries/{entry_id}").status_code == 204
    deleted = client.get(f"/api/diary/entries/{entry_id}")
    duplicate = client.post(
        "/api/diary/today", json={"diary_text": "같은 날 다시 작성하려는 충분히 긴 내용이다."}
    )

    assert deleted.json()["status"] == "deleted"
    assert deleted.json()["diary_text"] is None
    assert duplicate.status_code == 200
    assert duplicate.json()["status"] == "deleted"


def test_future_date_and_blank_final_entry_are_rejected(client: TestClient) -> None:
    create_authenticated_client(client)
    future = today_in_seoul() + timedelta(days=1)
    assert client.post(
        "/api/diary/entries",
        json={"entry_date": future.isoformat(), "diary_text": "미래 날짜에 작성하려는 일기 내용이다."},
    ).status_code == 422
    assert client.post(
        "/api/diary/entries",
        json={"entry_date": today_in_seoul().isoformat(), "diary_text": "   "},
    ).status_code == 422


def test_past_dates_cannot_be_written_or_drafted(client: TestClient) -> None:
    create_authenticated_client(client)
    yesterday = (today_in_seoul() - timedelta(days=1)).isoformat()
    created = client.post(
        "/api/diary/entries",
        json={"entry_date": yesterday, "diary_text": "어제 일을 오늘 몰아서 쓰려는 일기 내용이다."},
    )
    drafted = client.put(
        "/api/diary/draft",
        json={"entry_date": yesterday, "diary_text": "어제 날짜로 임시 저장"},
    )
    assert created.status_code == 422
    assert created.json()["detail"] == "일기는 오늘 날짜에만 쓸 수 있어요."
    assert drafted.status_code == 422
    assert client.get(f"/api/diary/by-date?entry_date={yesterday}").json()["status"] == "not_started"


def test_search_supports_date_and_primary_emotion_filters(client: TestClient) -> None:
    create_authenticated_client(client)
    entry_date = today_in_seoul()
    created = client.post(
        "/api/diary/entries",
        json={
            "entry_date": entry_date.isoformat(),
            "title": "필터 기록",
            "diary_text": "친구와 산책을 해서 즐겁고 행복했던 하루를 기록한다.",
        },
    ).json()

    created = confirm_entry(client, created).json()
    by_date = client.get(
        f"/api/diary/search?date_from={entry_date.isoformat()}&date_to={entry_date.isoformat()}"
    )
    by_emotion = client.get("/api/diary/search?emotion=joy")
    no_filter = client.get("/api/diary/search")

    assert [item["entry_id"] for item in by_date.json()["records"]] == [created["entry_id"]]
    assert [item["entry_id"] for item in by_emotion.json()["records"]] == [created["entry_id"]]
    assert by_emotion.json()["records"][0]["primary_emotion"] == "joy"
    assert no_filter.status_code == 422
