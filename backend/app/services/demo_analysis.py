from app.constants.emotions import (
    DETAIL_WORDS,
    EMOTION_LABELS,
    EMOTION_WORDS,
    KEYWORD_WORDS,
)
from app.schemas.emotions import (
    BaseEmotionKey,
    BaseEmotionScores,
    DetailStateResult,
    EmotionAnalysisPayload,
    KeywordResult,
)


def analyze_with_demo_rules(diary_text: str) -> EmotionAnalysisPayload:
    scores = {key.value: 5 for key in BaseEmotionKey}
    lowered = diary_text.lower()

    for emotion, words in EMOTION_WORDS.items():
        matches = sum(1 for word in words if word in lowered)
        if matches:
            scores[emotion.value] = min(100, 30 + matches * 20)

    if max(scores.values()) == 5:
        scores[BaseEmotionKey.CALM.value] = 35

    ranked = sorted(
        BaseEmotionKey,
        key=lambda key: (-scores[key.value], list(BaseEmotionKey).index(key)),
    )
    primary = ranked[0]
    secondary = [key for key in ranked[1:2] if scores[key.value] >= 20]

    detail_states = [
        DetailStateResult(key=key, confidence=75)
        for key, words in DETAIL_WORDS.items()
        if any(word in lowered for word in words)
    ][:3]

    keywords: list[KeywordResult] = []
    for category, words in KEYWORD_WORDS.items():
        matched = next((word for word in words if word in lowered), None)
        if matched:
            keywords.append(KeywordResult(text=matched, category=category))
        if len(keywords) == 5:
            break

    energy = 50
    energy += scores[BaseEmotionKey.EXCITEMENT.value] // 4
    energy += scores[BaseEmotionKey.ANGER.value] // 5
    energy -= scores[BaseEmotionKey.FATIGUE.value] // 4
    energy -= scores[BaseEmotionKey.LETHARGY.value] // 4
    energy = max(0, min(100, energy))

    if secondary:
        primary_score = scores[primary.value]
        secondary_score = scores[secondary[0].value]
        total = primary_score + secondary_score
        primary_ratio = round(primary_score / total * 100) if total else 50
        secondary_ratio = 100 - primary_ratio
    else:
        primary_ratio, secondary_ratio = 100, 0

    emotion_phrase = EMOTION_LABELS[primary]
    if secondary:
        emotion_phrase += f"과 {EMOTION_LABELS[secondary[0]]}"
    event_candidates = [
        part.strip()[:80]
        for part in re.split(r"[.!?。\n]+", diary_text)
        if part.strip()
    ][:5]
    concrete_objects = [keyword.text for keyword in keywords]
    confidence = min(90, max(30, scores[primary.value]))
    uncertainty_note = (
        "감정을 직접 나타내는 표현이 적어 문맥을 보수적으로 해석했어요."
        if confidence < 50
        else None
    )

    return EmotionAnalysisPayload(
        base_emotions=BaseEmotionScores(**scores),
        primary_emotion=primary,
        secondary_emotions=secondary,
        detail_states=detail_states,
        energy=energy,
        keywords=keywords,
        event_summary=f"일기에서 {EMOTION_LABELS[primary]} 감정이 가장 뚜렷하게 나타났어요.",
        primary_ratio=primary_ratio,
        secondary_ratio=secondary_ratio,
        reason=f"일기에 나타난 표현을 바탕으로 {emotion_phrase} 감정을 추정했어요.",
        events=event_candidates,
        objects=concrete_objects,
        confidence=confidence,
        uncertainty_note=uncertainty_note,
    )
import re
