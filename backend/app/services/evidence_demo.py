"""Explicit offline demo, not an AI model or a substitute for live evaluation."""
import re

from app.constants.emotions import EMOTION_WORDS
from app.schemas.emotion_review import EvidenceAnalysisPayload, SecondaryEmotionRelation
from app.services.character_generator import OBJECT_DECORATIONS


def analyze_evidence_demo(text: str) -> EvidenceAnalysisPayload:
    # Exclude event-only cues from the old demo dictionary.
    excluded = {"성공", "완료", "해냈", "혼자", "갑자기", "야근", "잠이", "아무것도", "눈물", "폭발"}
    clauses = [part.strip() for part in re.split(r"(?<=[.!?。])|(?<=는데)|(?<=지만)", text) if part.strip()]
    found = []
    for clause in clauses:
        for emotion, words in EMOTION_WORDS.items():
            cues = [word for word in words if word not in excluded]
            if emotion.value == "joy":
                cues += ["재미있", "기뻤", "즐겁"]
            if emotion.value == "fatigue":
                cues += ["졸리", "졸렸"]
            if emotion.value == "loneliness":
                cues += ["허전"]
            if not any(cue in clause for cue in cues) or re.search(r"않|아니|없었|없다", clause):
                continue
            if any(item[1]["emotion"] == emotion.value for item in found):
                continue
            strong = sum(clause.count(cue) for cue in ("너무", "정말", "엄청", "매우", "!!!"))
            intensity = 2 if any(word in clause for word in ("조금", "약간", "살짝")) else min(5, 3 + strong)
            found.append((text.index(clause), dict(emotion=emotion.value, intensity=intensity,
                evidence=clause, event="해당 문장에 기록한 경험", explanation="데모 규칙에서 직접적인 감정 표현을 찾았어요.")))
    found.sort(key=lambda pair: pair[0])
    emotions = [item for _, item in found[:2]]
    kind = "UNCERTAIN" if not emotions else "SINGLE" if len(emotions) == 1 else "MIXED"
    if emotions and any(word in text for word in ("축하", "합격")) and any(word in text for word in ("허전", "기쁘지 않")):
        kind = "CONTRAST"
    elif len(emotions) > 1 and any(word in text for word in ("아침", "나중", "만나니까", "뒤에는", "저녁")):
        kind = "TRANSITION"
    recommended = (emotions[-1] if kind == "TRANSITION" else emotions[0])["emotion"] if emotions else None
    if len(emotions) > 1:
        first, second = emotions[0]["emotion"], emotions[1]["emotion"]
        positive = {"joy", "excitement", "calm", "pride", "moved"}
        negative = {"sadness", "anger", "irritation", "anxiety", "loneliness", "disappointment", "fatigue", "lethargy"}
        relation = (
            SecondaryEmotionRelation.RELIEF if first in negative and second in positive
            else SecondaryEmotionRelation.REVERSAL if kind == "TRANSITION"
            else SecondaryEmotionRelation.RESIDUAL if kind == "CONTRAST"
            else SecondaryEmotionRelation.COMPANION
        )
        next(item for item in emotions if item["emotion"] != recommended)["relation"] = relation
    explanation = "단어 규칙으로 살펴본 데모 결과예요. 문맥 판단은 제한적이므로 직접 확인해 주세요."
    if not emotions:
        explanation = "직접적인 감정 표현을 찾지 못했어요. 오늘의 감정을 직접 선택해 주세요."
    if len(found) > 2:
        explanation += " 감정이 더 있었지만 대표 감정과 보조감정만 표시했어요."
    objects = list(dict.fromkeys(word for _, words in OBJECT_DECORATIONS for word in words if word in text))[:8]
    return EvidenceAnalysisPayload.model_validate(dict(
        status="analyzed" if emotions else "uncertain", emotions=emotions,
        relationship=dict(type=kind, sequence=[item["emotion"] for item in emotions] if kind == "TRANSITION" else [], explanation=explanation),
        recommended_emotion=recommended,
        objects=objects,
    )).verify_source(text)
