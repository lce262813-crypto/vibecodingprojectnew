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
    secondary = [key for key in ranked[1:3] if scores[key.value] >= 20]

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

    return EmotionAnalysisPayload(
        base_emotions=BaseEmotionScores(**scores),
        primary_emotion=primary,
        secondary_emotions=secondary,
        detail_states=detail_states,
        energy=energy,
        keywords=keywords,
        event_summary=f"일기에서 {EMOTION_LABELS[primary]} 감정이 가장 뚜렷하게 나타났어요.",
    )
