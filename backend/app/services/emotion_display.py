from app.constants.emotions import EMOTION_LABELS
from app.schemas.emotions import DisplayEmotion, EmotionAnalysisPayload


def build_display_emotions(payload: EmotionAnalysisPayload) -> list[DisplayEmotion]:
    result = [
        DisplayEmotion(
            key=payload.primary_emotion,
            label=EMOTION_LABELS[payload.primary_emotion],
            percentage=payload.primary_ratio or 100,
        )
    ]
    if payload.secondary_emotions:
        secondary = payload.secondary_emotions[0]
        result.append(
            DisplayEmotion(
                key=secondary,
                label=EMOTION_LABELS[secondary],
                percentage=payload.secondary_ratio or 0,
            )
        )
    return result
