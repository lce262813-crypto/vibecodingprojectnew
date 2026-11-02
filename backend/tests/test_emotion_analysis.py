from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.schemas.emotions import (
    BaseEmotionKey,
    BaseEmotionScores,
    EmotionAnalysisPayload,
)
from app.services.demo_analysis import analyze_with_demo_rules
from app.services.emotion_display import build_display_emotions
from app.services.openai_analysis import OpenAIEmotionAnalyzer
from tests.conftest import FakeEmotionAnalyzer


def authenticate(client: TestClient) -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "analysis@example.com",
            "password": "safe-password",
            "nickname": "분석친구",
        },
    )
    assert signup.status_code == 201
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "analysis@example.com", "password": "safe-password"},
        ).status_code
        == 200
    )


def test_live_failure_can_retry(
    client: TestClient, fake_analyzer: FakeEmotionAnalyzer
) -> None:
    authenticate(client)
    fake_analyzer.should_fail = True

    failed = client.post(
        "/api/diary/today",
        json={"diary_text": "오늘은 중요한 발표가 있어서 계속 긴장되고 걱정됐다."},
    )
    assert failed.status_code == 201
    assert failed.json()["status"] == "ai_failed"
    assert failed.json()["analysis"] is None

    fake_analyzer.should_fail = False
    retried = client.post("/api/diary/today/retry")

    assert retried.status_code == 200
    assert retried.json()["status"] == "completed"
    assert retried.json()["analysis"]["analysis_mode"] == "live"
    assert sum(
        item["percentage"]
        for item in retried.json()["analysis"]["display_emotions"]
    ) == 100


def test_live_failure_can_continue_with_demo(
    client: TestClient, fake_analyzer: FakeEmotionAnalyzer
) -> None:
    authenticate(client)
    fake_analyzer.should_fail = True
    client.post(
        "/api/diary/today",
        json={"diary_text": "야근 때문에 너무 피곤하고 아무것도 하기 싫었다."},
    )

    demo = client.post("/api/diary/today/demo")

    assert demo.status_code == 200
    assert demo.json()["status"] == "completed"
    assert demo.json()["analysis"]["analysis_mode"] == "demo"
    assert demo.json()["analysis"]["primary_emotion"] == "fatigue"


def test_demo_analysis_is_stable_and_schema_valid() -> None:
    text = "친구에게 좋은 연락을 받아서 설레고 기뻤지만 조금 긴장됐다."

    first = analyze_with_demo_rules(text)
    second = analyze_with_demo_rules(text)

    assert first == second
    assert first.primary_emotion in {BaseEmotionKey.JOY, BaseEmotionKey.EXCITEMENT}
    assert len(first.base_emotions.model_dump()) == 16
    display = build_display_emotions(first)
    assert sum(v.percentage for v in display) == 100
    assert display[0].label in {"기쁨", "설렘"}


def test_schema_rejects_non_maximum_primary_emotion() -> None:
    scores = {key.value: 0 for key in BaseEmotionKey}
    scores[BaseEmotionKey.SADNESS.value] = 90
    scores[BaseEmotionKey.JOY.value] = 10

    with pytest.raises(ValidationError):
        EmotionAnalysisPayload(
            base_emotions=BaseEmotionScores(**scores),
            primary_emotion=BaseEmotionKey.JOY,
            secondary_emotions=[],
            detail_states=[],
            energy=30,
            keywords=[],
            event_summary="슬픔이 가장 크게 나타남",
        )


def test_openai_analyzer_uses_responses_parse_without_storage(
    fake_analyzer: FakeEmotionAnalyzer,
) -> None:
    parsed = fake_analyzer.analyze("테스트를 위한 충분히 긴 일기 내용입니다.")
    captured: dict[str, object] = {}

    class FakeResponses:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(output_parsed=parsed)

    fake_client = SimpleNamespace(responses=FakeResponses())
    analyzer = OpenAIEmotionAnalyzer(
        api_key="test-key", model="gpt-6-luna", client=fake_client
    )

    result = analyzer.analyze("테스트를 위한 충분히 긴 일기 내용입니다.")

    assert result == parsed
    assert captured["model"] == "gpt-6-luna"
    assert captured["text_format"] is EmotionAnalysisPayload
    assert captured["store"] is False
    assert captured["reasoning"] == {"effort": "none"}
