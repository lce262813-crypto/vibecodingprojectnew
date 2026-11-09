from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from tests.review_helpers import confirm_entry
from pydantic import ValidationError

from app.schemas.emotions import (
    BaseEmotionKey,
    BaseEmotionScores,
    EmotionAnalysisPayload,
)
from app.services.demo_analysis import analyze_with_demo_rules
from app.services.emotion_display import build_display_emotions
from app.services.openai_analysis import EmotionAnalysisError, OpenAIEmotionAnalyzer
from app.schemas.emotion_review import EvidenceAnalysisPayload
from tests.conftest import FakeEmotionAnalyzer


@pytest.mark.parametrize(
    ("text", "expected_primary"),
    [
        ("합격 소식을 들어서 정말 기쁘고 행복하고 즐거웠다.", BaseEmotionKey.JOY),
        ("버스가 늦어서 조금 화가 났지만 금방 괜찮아졌다.", BaseEmotionKey.ANGER),
        ("계속 무시당해 분노했고 열받아서 감정이 폭발할 것 같았다.", BaseEmotionKey.ANGER),
        ("합격해서 기쁘지만 다음 시험이 걱정되고 불안하다.", BaseEmotionKey.ANXIETY),
        ("헤어져 슬프고 눈물이 났지만 친구의 위로에는 감동하고 뭉클했다.", BaseEmotionKey.MOVED),
        ("야근으로 피곤하고 지쳤고 아무것도 하기 싫을 만큼 무기력하다.", BaseEmotionKey.FATIGUE),
        ("오늘은 평소처럼 점심을 먹고 집에 돌아왔다.", BaseEmotionKey.CALM),
        ("아침에 회의를 하고 카페에서 커피를 마셨다. 오후에는 과제를 끝내고 친구와 영화를 봤다.", BaseEmotionKey.CALM),
    ],
)
def test_demo_covers_representative_diary_types(
    text: str, expected_primary: BaseEmotionKey
) -> None:
    result = analyze_with_demo_rules(text)
    assert result.primary_emotion == expected_primary
    assert len(result.base_emotions.model_dump()) == 16
    assert result.primary_ratio + result.secondary_ratio == 100
    assert 0 <= result.base_emotions.model_dump()[result.primary_emotion.value] <= 100
    assert result.reason
    assert len(result.events) <= 5
    assert len(result.objects) <= 8
    if not result.secondary_emotions:
        assert result.primary_ratio == 100
        assert result.secondary_ratio == 0
    if result.confidence < 50:
        assert result.uncertainty_note


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
    assert retried.json()["character"] is not None
    assert retried.json()["analysis"]["primary_ratio"] is None


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
    assert demo.json()["analysis"]["review"]["recommended_emotion"] == "fatigue"


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


def test_schema_rejects_invalid_ratio_total() -> None:
    scores = {key.value: 0 for key in BaseEmotionKey}
    scores[BaseEmotionKey.SADNESS.value] = 90
    scores[BaseEmotionKey.JOY.value] = 10

    with pytest.raises(ValidationError):
        EmotionAnalysisPayload(
            base_emotions=BaseEmotionScores(**scores),
            primary_emotion=BaseEmotionKey.JOY,
            secondary_emotions=[BaseEmotionKey.SADNESS],
            primary_ratio=70,
            secondary_ratio=20,
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
    assert captured["text_format"] is EvidenceAnalysisPayload
    assert captured["store"] is False
    assert captured["reasoning"] == {"effort": "none"}


def test_openai_quota_error_has_actionable_safe_message() -> None:
    class QuotaError(Exception):
        status_code = 429

    class FakeResponses:
        def parse(self, **kwargs):
            raise QuotaError("You have no credits remaining. billing details")

    analyzer = OpenAIEmotionAnalyzer(
        api_key="test-key", model="gpt-6-luna",
        client=SimpleNamespace(responses=FakeResponses()),
    )

    with pytest.raises(EmotionAnalysisError) as caught:
        analyzer.analyze("테스트 일기")

    assert caught.value.code == "billing_required"
    assert "크레딧이 부족합니다" in str(caught.value)
    assert "no credits remaining" not in str(caught.value)


def test_emotion_choice_is_not_exposed_and_ai_result_generates_character(client: TestClient) -> None:
    authenticate(client)
    created = client.post("/api/diary/today", json={"diary_text": "합격해서 기쁘지만 다음 시험이 조금 걱정되는 하루였다."}).json()
    assert created["status"] == "completed"
    assert created["character"] is not None
    assert created["analysis"]["ai_original"]
    updated = client.patch(f"/api/diary/entries/{created['entry_id']}/review", json={
        "revision": 1, "emotions": [{"emotion": "anxiety", "intensity": 3}],
        "selected_emotion": "anxiety",
        "relationship": {"type": "SINGLE", "sequence": [], "explanation": "걱정이 가장 컸어요."},
    })
    assert updated.status_code == 404
    saved = client.get(f"/api/diary/entries/{created['entry_id']}").json()
    assert saved["analysis"]["primary_emotion"] == created["analysis"]["primary_emotion"]
    assert saved["character"] == created["character"]


def test_analysis_override_rejects_invalid_labels_and_ratios(client: TestClient) -> None:
    authenticate(client)
    created = client.post(
        "/api/diary/today",
        json={"diary_text": "오늘은 친구와 산책해서 기분이 좋았던 하루였다."},
    ).json()
    url = f"/api/diary/entries/{created['entry_id']}/analysis"
    invalid_label = client.patch(
        url,
        json={
            "primary_emotion": "happiness",
            "secondary_emotion": None,
            "primary_ratio": 100,
            "secondary_ratio": 0,
            "primary_intensity": 70,
            "secondary_intensity": 0,
        },
    )
    invalid_ratio = client.patch(
        url,
        json={
            "primary_emotion": "joy",
            "secondary_emotion": "anxiety",
            "primary_ratio": 60,
            "secondary_ratio": 30,
            "primary_intensity": 70,
            "secondary_intensity": 30,
        },
    )
    assert invalid_label.status_code == 422
    assert invalid_ratio.status_code == 422


def test_duplicate_diary_submission_does_not_repeat_analysis(
    client: TestClient, fake_analyzer: FakeEmotionAnalyzer
) -> None:
    authenticate(client)
    payload = {"diary_text": "오늘은 친구와 함께 걸어서 즐겁고 행복한 하루였다."}
    first = client.post("/api/diary/today", json=payload)
    second = client.post("/api/diary/today", json=payload)
    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["entry_id"] == second.json()["entry_id"]
    assert fake_analyzer.calls == 1


def test_openai_client_uses_timeout_and_retry_policy(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class FakeResponses:
        def parse(self, **kwargs):
            from tests.conftest import fake_emotion_analyzer

            return SimpleNamespace(
                output_parsed=fake_emotion_analyzer.analyze("충분히 긴 테스트 일기")
            )

    class FakeClient:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.responses = FakeResponses()

    monkeypatch.setattr("app.services.openai_analysis.OpenAI", FakeClient)
    analyzer = OpenAIEmotionAnalyzer(api_key="test-key", model="gpt-6-luna")
    analyzer.analyze("민감한 원문은 로그에 남기지 않는 충분히 긴 테스트 일기")
    assert captured["timeout"] == 20.0
    assert captured["max_retries"] == 2
