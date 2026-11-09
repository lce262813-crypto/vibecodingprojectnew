from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.models import DailyEntry, User
from app.schemas.emotion_review import EvidenceAnalysisPayload
from app.services.evidence_demo import analyze_evidence_demo
from app.services.openai_analysis import EmotionAnalysisError, OpenAIEmotionAnalyzer
from app.services.diary import create_daily_entry
from app.services.clock import today_in_seoul
from app.services.emotion_review import claim_analysis, finish_analysis
from tests.test_diary import create_authenticated_client


def test_demo_analysis_quotes_source_and_uses_only_five_step_intensity():
    text = "오늘은 정말 행복했다. 친구들을 만나 하루 종일 웃었다."
    result = analyze_evidence_demo(text)
    assert result.status == "analyzed"
    assert result.recommended_emotion is not None
    assert len(result.emotions) <= 2
    assert all(item.evidence in text and 1 <= item.intensity <= 5 for item in result.emotions)
    assert "ratio" not in result.model_dump_json()


def test_auto_generation_uses_recommended_body_and_secondary_balloon(client):
    create_authenticated_client(client)
    text = "오늘 아침에는 너무 피곤했는데 친구들을 만나니까 재미있었다."
    response = client.post("/api/diary/today", json={"diary_text": text})
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "completed"
    assert data["character"] is not None
    review = data["analysis"]["review"]
    assert review["selected_emotion"] == review["recommended_emotion"]
    assert review["confirmed_by_user"] is False
    assert data["analysis"]["primary_ratio"] is None
    assert data["analysis"]["base_emotions"] == {}
    assert data["character"]["appearance"]["render_spec"]["primary_emotion"] == review["recommended_emotion"]
    if len(review["emotions"]) == 2:
        secondary = next(item for item in review["emotions"] if item["emotion"] != review["recommended_emotion"])
        spec = data["character"]["appearance"]["render_spec"]
        assert spec["secondary_emotion"] == secondary["emotion"]
        assert spec["secondary_relation"] == secondary["relation"]
    assert client.get("/api/characters").status_code == 200
    assert client.get("/api/diary/entries/" + data["entry_id"]).json()["character"] == data["character"]


def test_uncertain_analysis_does_not_create_emotion_or_character_and_edit_api_is_gone(client):
    create_authenticated_client(client)
    response = client.post("/api/diary/today", json={"diary_text": "오늘은 회사에 갔다가 집에 왔다."})
    data = response.json()
    assert data["status"] == "uncertain"
    assert data["analysis"]["review"]["emotions"] == []
    assert data["analysis"]["review"]["recommended_emotion"] is None
    assert data["character"] is None
    assert client.patch(f"/api/diary/entries/{data['entry_id']}/review", json={}).status_code == 404
    assert client.post(f"/api/diary/entries/{data['entry_id']}/confirm", json={}).status_code == 404


def test_reopening_pending_entry_retries_analysis_and_saves_character(client, db_session, fake_analyzer):
    create_authenticated_client(client)
    user = db_session.scalar(select(User))
    entry = create_daily_entry(db_session, user, today_in_seoul(), "오늘은 정말 행복했다.")
    entry.analysis_started_at = datetime.now(timezone.utc) - timedelta(minutes=3)
    db_session.commit()

    response = client.post(f"/api/diary/entries/{entry.id}/retry")

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["character"] is not None
    assert fake_analyzer.calls == 1
    repeated = client.post(f"/api/diary/entries/{entry.id}/retry")
    assert repeated.json()["character"] == response.json()["character"]
    assert fake_analyzer.calls == 1


def test_opening_legacy_review_waiting_for_confirmation_completes_saved_recommendation(client, db_session):
    create_authenticated_client(client)
    user = db_session.scalar(select(User))
    text = "오늘은 정말 행복했다."
    entry = create_daily_entry(db_session, user, today_in_seoul(), text)
    token = claim_analysis(db_session, entry)
    finish_analysis(db_session, entry, token, analyze_evidence_demo(text), mode="live")
    assert entry.status == "awaiting_confirmation"

    response = client.get(f"/api/diary/entries/{entry.id}")

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["character"] is not None


def test_invalid_emotion_stage_or_category_is_rejected():
    text = "오늘은 정말 행복했다."
    data = analyze_evidence_demo(text).model_dump(mode="json")
    data["emotions"][0]["intensity"] = 6
    with pytest.raises(ValidationError):
        EvidenceAnalysisPayload.model_validate(data)
    data = analyze_evidence_demo(text).model_dump(mode="json")
    data["emotions"][0]["emotion"] = "happiness"
    with pytest.raises(ValidationError):
        EvidenceAnalysisPayload.model_validate(data)


def test_fabricated_quote_is_rejected_without_logging_diary(caplog):
    result = analyze_evidence_demo("오늘은 정말 행복했다.").model_dump(mode="json")
    secret = "이 문장은 일기에 없어요"
    result["emotions"][0]["evidence"] = secret
    fake_client = SimpleNamespace(responses=SimpleNamespace(parse=lambda **kwargs: SimpleNamespace(output_parsed=result)))
    with pytest.raises(EmotionAnalysisError):
        OpenAIEmotionAnalyzer("test", "test", fake_client).analyze("오늘은 정말 행복했다.")
    assert secret not in caplog.text


def test_invalid_object_keyword_is_rejected():
    result = analyze_evidence_demo("오늘은 정말 행복했다.").model_dump(mode="json")
    result["objects"] = ["커피"]
    with pytest.raises(ValueError):
        EvidenceAnalysisPayload.model_validate(result).verify_source("오늘은 정말 행복했다.")
