from app.constants.emotions import EMOTION_LABELS
from app.schemas.emotions import DisplayEmotion, EmotionAnalysisPayload


def build_display_emotions(payload: EmotionAnalysisPayload) -> list[DisplayEmotion]:
    scores = payload.base_emotions.model_dump()
    selected = [payload.primary_emotion]
    selected.extend(
        key for key in payload.secondary_emotions if scores[key.value] >= 10
    )
    selected = selected[:3]

    selected_scores = [scores[key.value] for key in selected]
    total = sum(selected_scores)
    if total == 0:
        return [
            DisplayEmotion(
                key=payload.primary_emotion,
                label=EMOTION_LABELS[payload.primary_emotion],
                percentage=100,
            )
        ]

    percentages = [round(score / total * 100) for score in selected_scores]
    percentages[0] += 100 - sum(percentages)
    return [
        DisplayEmotion(
            key=key,
            label=EMOTION_LABELS[key],
            percentage=percentage,
        )
        for key, percentage in zip(selected, percentages, strict=True)
    ]
