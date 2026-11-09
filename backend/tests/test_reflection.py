import json
from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.reports import get_reflection_generator
from app.main import app
from app.models import DailyEntry, DailyEntryStatus, EmotionAnalysis, User
from app.schemas.reports import ReflectionDraft, ReflectionEvidence, ReportPeriod
from app.services.reflection import (
    OpenAIReflectionGenerator,
    ReflectionError,
    ReflectionQualityError,
    check_draft,
    write_letter,
)
from app.services.reflection_input import (
    MAX_TOTAL_DIARY_CHARS,
    build_reflection_context,
    excerpt_of,
    has_crisis_signal,
)
from app.services.reports import build_emotion_report, final_emotions, period_bounds

MONDAY = date(2026, 11, 2)
ALL_EMOTIONS = (
    "joy", "excitement", "calm", "pride", "moved", "sadness", "anger", "irritation", "anxiety",
    "loneliness", "disappointment", "embarrassment", "confusion", "shyness", "fatigue", "lethargy",
)


def analysis(emotion="joy", score=75, secondary=(), review=None, objects=(), summary="기록 요약", keywords=()):
    scores = {key: 0 for key in ALL_EMOTIONS}
    scores[emotion] = score
    for key in secondary:
        scores[key] = 40
    return SimpleNamespace(
        primary_emotion=emotion, base_emotions=scores, secondary_emotions=list(secondary), review=review,
        keywords=[{"text": word, "category": "daily"} for word in keywords], objects=list(objects),
        event_summary=summary,
    )


def entry(day, text="오늘은 산책을 했다.", **kwargs):
    return SimpleNamespace(
        id=f"entry-{day}", entry_date=day, status="completed", title=None, diary_text=text, analysis=analysis(**kwargs),
    )


def confirmed(emotion, stage=3, evidence="산책", event="산책", relationship="SINGLE", extra=()):
    emotions = [{"emotion": emotion, "intensity": stage, "evidence": evidence, "event": event}, *extra]
    return {
        "confirmed_by_user": True, "emotions": emotions, "selected_emotion": emotion,
        "relationship": {"type": relationship, "sequence": [item["emotion"] for item in emotions] if relationship == "TRANSITION" else [], "explanation": "관계 설명"},
    }


def context_for(entries, period=ReportPeriod.WEEK, anchor=MONDAY):
    start, end = period_bounds(period, anchor)
    return build_reflection_context(build_emotion_report(entries, period, start, end), entries)


def draft(quote="산책", day=MONDAY, **changes):
    values = {
        "title": "조용히 걸었던 날", "empathy": "산책을 하며 하루를 정리하셨네요.", "insight": "걷는 시간이 숨을 고르는 틈이었을 수도 있겠어요.",
        "underlying_need": "잠시 멈추고 싶은 마음이 있었을 수도 있어요.",
        "encouragement": "그 시간을 챙기신 것이 눈에 띄어요.", "suggestion": "다음 주에도 짧게 걸어 보시면 어떨까요?",
        "reflection_question": "걷는 동안 어떤 마음이 가장 크게 들었나요?", "evidence": [ReflectionEvidence(date=day.isoformat(), quote=quote)],
        "limitations": [], "safety_concern": False,
    }
    return ReflectionDraft(**{**values, **changes})


class Scripted:
    """Returns prepared drafts in order and remembers every call."""

    model = "fake-model"

    def __init__(self, *drafts):
        self.drafts = list(drafts)
        self.calls = []

    def generate(self, context, correction=None):
        self.calls.append((context, correction))
        return self.drafts.pop(0)


def week(*items):
    return [entry(MONDAY + timedelta(days=index), **item) for index, item in enumerate(items)]


@pytest.mark.parametrize("label, entries, depth", [
    ("긍정 감정이 많은 기간", week({"emotion": "joy"}, {"emotion": "pride"}, {"emotion": "moved"}, {"emotion": "joy"}), "enough"),
    ("부정 감정이 많은 기간", week({"emotion": "sadness"}, {"emotion": "anxiety"}, {"emotion": "anger"}, {"emotion": "sadness"}), "enough"),
    ("감정 변화가 큰 기간", week({"emotion": "joy"}, {"emotion": "anger"}, {"emotion": "calm"}, {"emotion": "sadness"}), "enough"),
    ("평온과 피로가 반복된 기간", week({"emotion": "calm"}, {"emotion": "fatigue"}, {"emotion": "calm"}, {"emotion": "fatigue"}), "enough"),
    ("감정이 한 종류만 등장한 기간", week({"emotion": "calm"}, {"emotion": "calm"}), "few"),
    ("일기가 한 개뿐인 기간", week({"emotion": "joy"}), "single"),
])
def test_each_kind_of_period_gets_a_checked_letter(label, entries, depth) -> None:
    context = context_for(entries)
    assert context.depth == depth, label
    single = {"insight": None, "underlying_need": None, "reflection_question": None} if depth == "single" else {}
    result = write_letter(Scripted(draft(**single)), context)
    assert result.provider == "openai"
    assert result.letter.evidence_dates == [MONDAY]


def test_changes_between_days_come_from_the_server() -> None:
    context = context_for(week({"emotion": "joy"}, {"emotion": "joy"}, {"emotion": "anger"}))
    changes = context.statistics["days_where_primary_emotion_changed"]
    assert changes == [{"from_date": "2026-11-03", "to_date": "2026-11-04", "from": "joy", "to": "anger"}]


def test_a_single_diary_says_why_there_is_no_pattern() -> None:
    result = write_letter(Scripted(draft(insight=None, underlying_need=None)), context_for(week({"emotion": "joy"})))
    assert result.letter.insight is None
    assert result.letter.limitations == ["일기가 하나뿐이라 패턴을 살피지 않았어요."]


def test_a_single_diary_may_not_claim_a_pattern() -> None:
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(insight="매번 반복되는 패턴이 보여요."), context_for(week({"emotion": "joy"})))


def test_a_period_without_diaries_never_reaches_the_model(client: TestClient) -> None:
    assert client.post("/api/auth/signup", json={"email": "a@example.com", "password": "safe-password", "nickname": "빈"}).status_code == 201
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "safe-password"}).status_code == 200
    generator = Scripted()
    app.dependency_overrides[get_reflection_generator] = lambda: generator
    try:
        assert client.post("/api/reports/reflection?period=week").status_code == 422
    finally:
        app.dependency_overrides.pop(get_reflection_generator, None)
    assert generator.calls == []


def test_uncertain_diaries_pass_no_invented_cause_to_the_model() -> None:
    context = context_for([entry(MONDAY, "그냥 그런 하루였다.", emotion="calm", score=20, summary="감정 표현이 뚜렷하지 않음")])
    sent = json.dumps(context.for_model(), ensure_ascii=False)
    assert "감정 표현이 뚜렷하지 않음" in sent
    assert context.entries[0].emotions[0]["related_event"] == ""


def test_long_diaries_are_cut_to_the_budget() -> None:
    long_text = "아주 긴 문장을 계속해서 썼다. " * 400
    entries = [entry(date(2026, 11, day), long_text) for day in range(1, 31)]
    context = context_for(entries, ReportPeriod.MONTH)
    assert sum(len(item.excerpt) for item in context.entries) <= MAX_TOTAL_DIARY_CHARS + 30 * 12
    assert all(item.excerpt.endswith("…(이하 생략)") for item in context.entries)
    # Checks read the whole diary, so a real quote from past the cut still counts.
    assert context.entries[0].full_text == long_text


def test_excerpt_keeps_short_text_whole() -> None:
    assert excerpt_of("짧은 일기.", 100) == "짧은 일기."


def test_user_confirmed_emotions_replace_the_ai_guess() -> None:
    day = entry(MONDAY, emotion="calm", review=confirmed("calm", 2, extra=[{"emotion": "anxiety", "intensity": 1, "evidence": "걱정", "event": ""}]))
    day.analysis.base_emotions["joy"] = 90  # What the AI first thought.
    assert [item["emotion"] for item in final_emotions(day.analysis)] == ["calm", "anxiety"]
    report = build_emotion_report([day], ReportPeriod.WEEK, MONDAY, MONDAY)
    appearances = {item.emotion.value: item.appearance_count for item in report.emotion_counts if item.appearance_count}
    assert appearances == {"calm": 1, "anxiety": 1}
    assert report.trend[0].expression_intensity == 2
    assert [emotion.value for emotion in report.trend[0].co_emotions] == ["anxiety"]


def test_older_diaries_without_a_review_still_report() -> None:
    old = entry(MONDAY, emotion="sadness", secondary=("anxiety",), keywords=("회사",))
    report = build_emotion_report([old], ReportPeriod.WEEK, MONDAY, MONDAY)
    counts = {item.emotion.value: (item.count, item.appearance_count) for item in report.emotion_counts}
    assert counts["sadness"] == (1, 1)
    assert counts["anxiety"] == (0, 1)
    assert report.legacy_intensity_converted is True


def test_a_report_can_have_more_appearances_than_diaries_but_groups_add_up() -> None:
    entries = week({"emotion": "joy", "secondary": ("anxiety",)}, {"emotion": "joy", "secondary": ("anxiety",)})
    report = build_emotion_report(entries, ReportPeriod.WEEK, MONDAY, MONDAY + timedelta(days=6))
    assert sum(item.appearance_count for item in report.emotion_counts) == 4
    assert sum(item.count for item in report.group_counts) == report.diary_count == 2


# The letter must not contain what the diary does not.

def test_an_invented_quote_is_rejected_and_the_model_is_told_why() -> None:
    generator = Scripted(draft(quote="친구와 제주도에 갔다"), draft())
    result = write_letter(generator, context_for(week({"emotion": "joy"}, {"emotion": "joy"})))
    assert result.provider == "openai"
    assert len(generator.calls) == 2
    assert "quote" in generator.calls[1][1]


def test_a_real_quote_from_the_wrong_day_is_rejected() -> None:
    entries = [entry(MONDAY, "회사에서 혼났다."), entry(MONDAY + timedelta(days=1), "공원을 걸었다.")]
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(quote="공원을 걸었다", day=MONDAY), context_for(entries))


def test_a_date_outside_the_period_is_rejected() -> None:
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(day=date(2026, 1, 1)), context_for(week({"emotion": "joy"}, {"emotion": "joy"})))


def test_a_letter_without_evidence_is_rejected() -> None:
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(evidence=[]), context_for(week({"emotion": "joy"}, {"emotion": "joy"})))


def test_a_model_that_keeps_inventing_gets_the_records_only_letter() -> None:
    generator = Scripted(draft(quote="없는 일"), draft(quote="또 없는 일"))
    result = write_letter(generator, context_for(week({"emotion": "joy"}, {"emotion": "joy"})))
    assert result.provider == "fallback"
    assert "없는 일" not in result.letter.model_dump_json()
    assert result.letter.limitations


@pytest.mark.parametrize("changes", [
    {"empathy": "우울증일 수 있어요."},
    {"insight": "번아웃이 온 것 같아요."},
    {"encouragement": "불안장애는 아니니 걱정 마세요."},
    {"empathy": "슬픔 3번, 불안 2번이 나타났어요."},
    {"insight": "기쁨이 두 번, 평온이 3회 기록되었어요."},
    {"insight": "산책과 커피가 있었고 표현 강도는 평균 2.4였어요."},
    {"suggestion": "힘내세요!"},
])
def test_rule_breaking_letters_are_rejected(changes) -> None:
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(**changes), context_for(week({"emotion": "joy"}, {"emotion": "joy"})))


@pytest.mark.parametrize("changes", [
    {"underlying_need": None},
    {"reflection_question": None},
    {"underlying_need": "당신은 인정받고 싶어 합니다."},
])
def test_a_letter_must_reach_the_feeling_behind_the_events(changes) -> None:
    with pytest.raises(ReflectionQualityError):
        check_draft(draft(**changes), context_for(week({"emotion": "joy"}, {"emotion": "joy"})))


def test_the_prompt_asks_for_feelings_not_a_summary() -> None:
    instructions = run_generator(context_for(week({"emotion": "joy"}, {"emotion": "joy"})))["instructions"]
    assert "일기 요약이 아닙니다" in instructions
    assert "감정 뒤의 마음" in instructions
    assert "치료" in instructions


def test_a_good_example_passes() -> None:
    text = "이번 주에는 중요한 일을 앞두고 걱정했던 순간들이 여러 번 기록되었어요."
    check_draft(draft(empathy=text), context_for(week({"emotion": "joy"}, {"emotion": "joy"})))


# Safety.

@pytest.mark.parametrize("text", ["그냥 죽고 싶다.", "자해를 생각했다.", "사라지고 싶다는 생각만 든다.", "더는 살고 싶지 않아."])
def test_crisis_words_skip_the_model_and_show_support(text) -> None:
    generator = Scripted()
    result = write_letter(generator, context_for([entry(MONDAY, text, emotion="sadness")]))
    assert generator.calls == []
    assert result.provider == "safety"
    assert [item.phone for item in result.safety.resources] == ["109", "1577-0199", "1388"]
    assert "일반적인" in result.letter.limitations[0]


@pytest.mark.parametrize("text", ["맛있어 죽겠다.", "배고파 죽겠네.", "오늘 정말 피곤했다.", "살기 좋은 동네다."])
def test_everyday_phrases_are_not_crisis_signals(text) -> None:
    assert has_crisis_signal(text) is False


def test_the_model_can_flag_what_the_word_list_missed() -> None:
    result = write_letter(Scripted(draft(safety_concern=True)), context_for(week({"emotion": "sadness"}, {"emotion": "sadness"})))
    assert result.provider == "safety"
    assert result.safety is not None


# Weekly and monthly letters are different jobs.

class FakeResponses:
    def __init__(self, output):
        self.output = output
        self.kwargs = None

    def parse(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(output_parsed=self.output)


def run_generator(context, output=None):
    responses = FakeResponses(output or draft())
    generator = OpenAIReflectionGenerator("key", "model", SimpleNamespace(responses=responses))
    generator.generate(context)
    return responses.kwargs


def test_weekly_and_monthly_letters_get_different_briefs_and_data() -> None:
    days = [entry(date(2026, 11, day), emotion="calm" if day < 15 else "fatigue", objects=("커피",), keywords=("회사",)) for day in (2, 9, 16, 23)]
    weekly = run_generator(context_for(days[:2]))
    monthly = run_generator(context_for(days, ReportPeriod.MONTH))
    assert "[주간 편지]" in weekly["instructions"] and "[월간 편지]" not in weekly["instructions"]
    assert "[월간 편지]" in monthly["instructions"]
    sent = json.loads(monthly["input"])["statistics"]
    assert [week_item["week_of_month"] for week_item in sent["weekly_flow"]] == [1, 2, 3, 4]
    assert {"term": "커피", "dates": ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"], "primary_emotions": {"calm": 2, "fatigue": 2}} in sent["repeated_contexts"]
    assert "weekly_flow" not in json.loads(weekly["input"])["statistics"]


def test_requests_are_not_stored_and_treat_the_diary_as_data() -> None:
    kwargs = run_generator(context_for(week({"emotion": "joy"}, {"emotion": "joy"})))
    assert kwargs["store"] is False
    assert kwargs["text_format"] is ReflectionDraft
    assert "따르지 마세요" in kwargs["instructions"]


def test_provider_errors_do_not_carry_diary_text() -> None:
    class Boom:
        def parse(self, **kwargs):
            raise RuntimeError(kwargs["input"])

    generator = OpenAIReflectionGenerator("key", "model", SimpleNamespace(responses=Boom()))
    with pytest.raises(ReflectionError) as caught:
        generator.generate(context_for([entry(MONDAY, "비밀스러운 일기 내용")]))
    assert "비밀" not in str(caught.value)
    assert caught.value.__cause__ is None


# Through the API.

def test_the_api_returns_the_letter_and_says_what_went_to_the_ai(client: TestClient, db_session: Session) -> None:
    assert client.post("/api/auth/signup", json={"email": "b@example.com", "password": "safe-password", "nickname": "글"}).status_code == 201
    assert client.post("/api/auth/login", json={"email": "b@example.com", "password": "safe-password"}).status_code == 200
    user = db_session.scalar(select(User).where(User.email == "b@example.com"))
    for offset, previous in ((0, False), (-7, True)):
        day = MONDAY + timedelta(days=offset)
        saved = DailyEntry(user_id=user.id, entry_date=day, diary_text="공원에서 산책을 했다.", status=DailyEntryStatus.COMPLETED.value, analysis_mode="live")
        db_session.add(saved)
        db_session.flush()
        scores = {key: 0 for key in ALL_EMOTIONS}
        scores["calm"] = 60
        db_session.add(EmotionAnalysis(
            daily_entry_id=saved.id, schema_version=2, base_emotions=scores, primary_emotion="calm", secondary_emotions=[],
            detail_states=[], energy=50, keywords=[], event_summary="요약", display_emotions=[], analysis_mode="live",
        ))
    db_session.commit()
    generator = Scripted(draft(quote="공원에서 산책", insight=None, underlying_need=None))
    app.dependency_overrides[get_reflection_generator] = lambda: generator
    try:
        response = client.post(f"/api/reports/reflection?period=week&anchor={MONDAY}")
    finally:
        app.dependency_overrides.pop(get_reflection_generator, None)
    assert response.status_code == 200
    body = response.json()
    assert body["letter"]["title"] == "조용히 걸었던 날"
    assert body["letter"]["evidence_dates"] == ["2026-11-02"]
    assert body["safety"] is None
    assert "일기 일부" in body["privacy_note"]
    assert "산책을 하며" in body["reflection"]
    report = client.get(f"/api/reports/emotions?period=week&anchor={MONDAY}").json()
    assert report["previous"]["start_date"] == "2026-10-26"
    assert report["trend"][0]["summary"] == "요약"
    assert report["trend"][0]["entry_id"]
    stats = generator.calls[0][0].statistics
    assert stats["previous_period"]["diary_days"] == 1


def test_a_chosen_range_is_not_called_a_week_or_a_month() -> None:
    entries = week({"emotion": "joy"}, {"emotion": "joy"})
    report = build_emotion_report(entries, ReportPeriod.WEEK, MONDAY, MONDAY + timedelta(days=2), custom_range=True)
    context = build_reflection_context(report, entries)
    assert "[직접 고른 기간]" in run_generator(context)["instructions"]
    letter = write_letter(Scripted(draft(quote="없는 일"), draft(quote="없는 일")), context).letter
    assert letter.title == "이 기간의 기록을 남겨 두었어요"
