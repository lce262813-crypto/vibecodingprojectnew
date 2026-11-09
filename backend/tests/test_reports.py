from datetime import date, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient
from tests.review_helpers import confirm_entry
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DailyEntry, DailyEntryStatus, EmotionAnalysis, User
from app.schemas.reports import ReportPeriod
from app.services.clock import today_in_seoul
from app.services.reports import (
    build_emotion_report,
    period_bounds,
    subtract_one_month,
    subtract_one_year,
)


def authenticate(client: TestClient, email: str = "report@example.com") -> None:
    assert client.post(
        "/api/auth/signup",
        json={"email": email, "password": "safe-password", "nickname": "리포터"},
    ).status_code == 201
    assert client.post(
        "/api/auth/login",
        json={"email": email, "password": "safe-password"},
    ).status_code == 200


def add_entry(
    db: Session,
    user: User,
    entry_date: date,
    emotion: str = "joy",
    intensity: int = 80,
    keyword: str = "친구",
) -> DailyEntry:
    scores = {key: 0 for key in (
        "joy", "excitement", "calm", "pride", "moved", "sadness", "anger",
        "irritation", "anxiety", "loneliness", "disappointment", "embarrassment",
        "confusion", "shyness", "fatigue", "lethargy",
    )}
    scores[emotion] = intensity
    entry = DailyEntry(
        user_id=user.id,
        entry_date=entry_date,
        title=f"{emotion} 기록",
        diary_text="저장된 원문 일기입니다.",
        status=DailyEntryStatus.COMPLETED.value,
        analysis_mode="live",
    )
    db.add(entry)
    db.flush()
    entry.analysis = EmotionAnalysis(
        daily_entry_id=entry.id,
        schema_version=2,
        base_emotions=scores,
        primary_emotion=emotion,
        secondary_emotions=[],
        primary_ratio=100,
        secondary_ratio=0,
        detail_states=[],
        energy=50,
        keywords=[{"text": keyword, "category": "social"}],
        event_summary="테스트 기록",
        reason="테스트 근거",
        events=[],
        objects=[],
        confidence=80,
        uncertainty_note=None,
        display_emotions=[{"key": emotion, "label": emotion, "percentage": 100}],
        analysis_mode="live",
        provider="test",
        model_name="test",
        prompt_version="test",
        is_user_edited=False,
        user_override=None,
    )
    db.commit()
    return entry


def test_empty_account_report_has_all_emotions_and_no_invented_summary(
    client: TestClient,
) -> None:
    authenticate(client)
    response = client.get("/api/reports/emotions?period=month")
    assert response.status_code == 200
    body = response.json()
    assert body["diary_days"] == 0
    assert body["diary_count"] == 0
    assert body["most_frequent_primary"] is None
    assert body["average_intensity"] is None
    assert len(body["emotion_counts"]) == 16
    assert client.post("/api/reports/reflection?period=month").status_code == 422


def test_report_uses_saved_and_user_edited_analysis(
    client: TestClient, db_session: Session
) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "report@example.com"))
    assert user is not None
    today = today_in_seoul()
    add_entry(db_session, user, today, "joy", 40, "커피")
    add_entry(db_session, user, today - timedelta(days=1), "fatigue", 90, "커피")

    response = client.get(f"/api/reports/emotions?period=week&anchor={today}")
    assert response.status_code == 200
    body = response.json()
    assert body["diary_days"] == 2
    assert body["diary_count"] == 2
    assert body["average_intensity"] == 65
    assert {item["emotion"]: item["count"] for item in body["emotion_counts"]}["fatigue"] == 1
    assert body["frequent_keywords"][0] == {"keyword": "커피", "count": 2}


def test_aggregator_handles_multiple_entries_on_the_same_date() -> None:
    day = date(2026, 11, 4)
    entries = [
        SimpleNamespace(id="a", title=None, entry_date=day, status="completed", analysis=SimpleNamespace(review=None,
            primary_emotion="joy", secondary_emotions=[], event_summary="", base_emotions={"joy": 60}, keywords=[])),
        SimpleNamespace(id="b", title=None, entry_date=day, status="completed", analysis=SimpleNamespace(review=None,
            primary_emotion="anxiety", secondary_emotions=[], event_summary="", base_emotions={"anxiety": 80}, keywords=[])),
    ]
    report = build_emotion_report(entries, ReportPeriod.WEEK, day, day)
    assert report.diary_days == 1
    assert report.diary_count == 2
    assert report.trend[0].diary_count == 2
    assert report.trend[0].average_intensity == 70


def test_on_this_day_is_scoped_to_the_signed_in_user(
    client: TestClient, db_session: Session
) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "report@example.com"))
    assert user is not None
    anchor = date(2026, 11, 4)
    add_entry(db_session, user, date(2026, 10, 4), "calm", 55)

    response = client.get(f"/api/reports/on-this-day?anchor={anchor}")
    assert response.status_code == 200
    assert response.json()["one_month_ago"]["entries"][0]["diary_text"] == "저장된 원문 일기입니다."
    assert response.json()["one_year_ago"]["entries"] == []


def test_ai_selected_emotion_is_reflected_in_report(client: TestClient) -> None:
    authenticate(client)
    created = client.post(
        "/api/diary/today",
        json={"title": "\uC790\uB3D9 \uBD84\uC11D \uAE30\uB85D", "diary_text": "\uC624\uB298\uC740 \uC815\uB9D0 \uD589\uBCF5\uD588\uB2E4. \uCE5C\uAD6C\uC640 \uC990\uAC70\uC6E0\uB2E4."},
    )
    assert created.status_code == 201
    payload = created.json()
    assert payload["status"] == "completed"
    response = client.get("/api/reports/emotions?period=month")
    counts = {item["emotion"]: item["count"] for item in response.json()["emotion_counts"]}
    assert counts[payload["analysis"]["primary_emotion"]] == 1
    primary = next(item for item in payload["analysis"]["review"]["emotions"] if item["emotion"] == payload["analysis"]["primary_emotion"])
    assert response.json()["average_expression_intensity"] == primary["intensity"]


def test_period_bounds_follow_monday_weeks_and_calendar_months() -> None:
    # 2026-11-04 is a Wednesday.
    assert period_bounds(ReportPeriod.WEEK, date(2026, 11, 4)) == (date(2026, 11, 2), date(2026, 11, 8))
    assert period_bounds(ReportPeriod.WEEK, date(2026, 11, 8)) == (date(2026, 11, 2), date(2026, 11, 8))
    assert period_bounds(ReportPeriod.MONTH, date(2028, 2, 10)) == (date(2028, 2, 1), date(2028, 2, 29))


def test_past_dates_clamp_to_the_end_of_shorter_months() -> None:
    assert subtract_one_month(date(2026, 3, 31)) == date(2026, 2, 28)
    assert subtract_one_month(date(2026, 1, 15)) == date(2025, 12, 15)
    assert subtract_one_year(date(2028, 2, 29)) == date(2027, 2, 28)


def test_report_window_excludes_entries_just_outside_the_week(
    client: TestClient, db_session: Session
) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "report@example.com"))
    assert user is not None
    add_entry(db_session, user, date(2026, 11, 1), "sadness")  # previous Sunday
    add_entry(db_session, user, date(2026, 11, 2), "joy")  # Monday
    add_entry(db_session, user, date(2026, 11, 8), "calm")  # Sunday
    add_entry(db_session, user, date(2026, 11, 9), "anger")  # next Monday

    body = client.get("/api/reports/emotions?period=week&anchor=2026-11-04").json()
    counts = {item["emotion"]: item["count"] for item in body["emotion_counts"] if item["count"]}
    assert counts == {"joy": 1, "calm": 1}


def test_reports_default_to_the_seoul_date(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    # Just after midnight in Seoul it is still the previous day in UTC; the report must use Seoul.
    monkeypatch.setattr("app.api.reports.today_in_seoul", lambda: date(2026, 12, 1))
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "report@example.com"))
    assert user is not None
    add_entry(db_session, user, date(2026, 12, 1), "joy")
    add_entry(db_session, user, date(2026, 11, 30), "sadness")

    body = client.get("/api/reports/emotions?period=month").json()
    assert (body["start_date"], body["end_date"]) == ("2026-12-01", "2026-12-31")
    assert body["diary_count"] == 1
    past = client.get("/api/reports/on-this-day").json()
    assert past["anchor_date"] == "2026-12-01"
    assert past["one_month_ago"]["target_date"] == "2026-11-01"


def test_a_chosen_range_reports_exactly_those_dates(client: TestClient, db_session: Session) -> None:
    authenticate(client)
    user = db_session.scalar(select(User).where(User.email == "report@example.com"))
    assert user is not None
    add_entry(db_session, user, date(2026, 10, 31), "sadness")  # Just before.
    add_entry(db_session, user, date(2026, 11, 1), "joy")
    add_entry(db_session, user, date(2026, 11, 3), "calm")
    add_entry(db_session, user, date(2026, 11, 4), "anger")  # Just after.

    body = client.get("/api/reports/emotions?start_date=2026-11-01&end_date=2026-11-03").json()
    counts = {item["emotion"]: item["count"] for item in body["emotion_counts"] if item["count"]}
    assert counts == {"joy": 1, "calm": 1}
    assert (body["start_date"], body["end_date"]) == ("2026-11-01", "2026-11-03")
    assert body["custom_range"] is True
    assert body["period"] == "week"
    # The three days before it: October 29 to 31.
    assert (body["previous"]["start_date"], body["previous"]["end_date"]) == ("2026-10-29", "2026-10-31")
    assert body["previous"]["most_frequent_primary"] == "sadness"


def test_a_long_chosen_range_reads_like_a_month_and_presets_stay_as_they_were(client: TestClient) -> None:
    authenticate(client)
    two_weeks = client.get("/api/reports/emotions?start_date=2026-11-01&end_date=2026-11-14").json()
    assert two_weeks["period"] == "week"
    longer = client.get("/api/reports/emotions?start_date=2026-11-01&end_date=2026-11-15").json()
    assert longer["period"] == "month"
    preset = client.get("/api/reports/emotions?period=week&anchor=2026-11-04").json()
    assert preset["custom_range"] is False


def test_a_single_day_range_is_allowed(client: TestClient) -> None:
    authenticate(client)
    body = client.get("/api/reports/emotions?start_date=2026-11-04&end_date=2026-11-04").json()
    assert body["start_date"] == body["end_date"] == "2026-11-04"


def test_impossible_ranges_are_refused(client: TestClient) -> None:
    authenticate(client)
    for query, message in (
        ("start_date=2026-11-05&end_date=2026-11-04", "늦을 수 없습니다"),
        ("start_date=2025-01-01&end_date=2026-11-04", "최대 1년"),
        ("start_date=2026-11-04", "함께"),
    ):
        for method, path in ((client.get, "emotions"), (client.post, "reflection")):
            response = method(f"/api/reports/{path}?{query}")
            assert response.status_code == 422
            assert message in response.json()["detail"]
