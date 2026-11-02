from typing import Any

from openai import OpenAI

from app.schemas.emotions import EmotionAnalysisPayload

SYSTEM_INSTRUCTIONS = """
당신은 한국어 감정 일기를 캐릭터 생성용 데이터로 변환하는 분석기입니다.
의학적·심리학적 진단을 하지 말고, 사용자가 작성한 문맥 안에서만 감정을 해석하세요.
16개 기본 감정 점수를 모두 0~100 정수로 채우세요.
primary_emotion은 반드시 가장 높은 점수의 기본 감정이어야 합니다.
secondary_emotions는 주요 감정을 제외하고 최대 2개만 선택하세요.
detail_states는 허용된 세부 상태 중 문맥이 뚜렷한 것만 최대 3개 선택하세요.
keywords는 장식 선택에 도움이 되는 사건·사물만 최대 5개 선택하세요.
event_summary는 개인정보를 새로 추측하지 말고 200자 이내의 한국어 한 문장으로 작성하세요.
""".strip()


class EmotionAnalysisError(RuntimeError):
    """Raised when live emotion analysis cannot produce a valid result."""


class OpenAIEmotionAnalyzer:
    def __init__(
        self,
        api_key: str,
        model: str,
        client: Any | None = None,
    ) -> None:
        self.api_key = api_key.strip()
        self.model = model.strip()
        self.client = client

    def analyze(self, diary_text: str) -> EmotionAnalysisPayload:
        if not self.api_key or not self.model:
            raise EmotionAnalysisError("실제 AI 분석 설정이 필요합니다.")

        client = self.client or OpenAI(api_key=self.api_key)
        try:
            response = client.responses.parse(
                model=self.model,
                instructions=SYSTEM_INSTRUCTIONS,
                input=diary_text,
                text_format=EmotionAnalysisPayload,
                reasoning={"effort": "none"},
                max_output_tokens=2000,
                store=False,
            )
        except Exception as exc:
            raise EmotionAnalysisError("실제 AI 분석에 실패했습니다.") from exc

        if response.output_parsed is None:
            raise EmotionAnalysisError("구조화된 감정 분석 결과가 없습니다.")
        return EmotionAnalysisPayload.model_validate(response.output_parsed)
