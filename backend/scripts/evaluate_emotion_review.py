"""Opt-in live evaluation using synthetic diaries only; never reads stored diaries."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import get_settings
from app.services.openai_analysis import OpenAIEmotionAnalyzer, EmotionAnalysisError

CASES = [
    ("single", "오늘 시험에 합격했다. 너무 행복했다.", "SINGLE"),
    ("mixed", "합격해서 기쁘지만 앞으로 잘할 수 있을지 걱정된다.", "MIXED"),
    ("transition", "오늘 아침에는 너무 피곤했는데 친구들을 만나니까 재미있었다.", "TRANSITION"),
    ("contrast", "모두가 축하해 줬지만 마음은 허전했다.", "CONTRAST"),
    ("uncertain", "오늘은 회사에 갔다가 집에 왔다.", "UNCERTAIN"),
    ("many", "아침엔 피곤했다. 점심엔 친구와 즐거웠다. 저녁엔 내일이 불안했고 헤어진 친구가 그리워 외로웠다.", "TRANSITION"),
    ("weak", "버스가 늦어서 조금 화가 났지만 금방 괜찮아졌다.", None),
    ("very_strong", "계속 무시당해서 정말 너무 화가 났다. 참을 수 없이 화가 나고 또 화가 났다!!!", "SINGLE"),
    ("events_only", "회의에 참석했다. 커피를 마셨다. 집에 와서 책을 읽었다.", "UNCERTAIN"),
    ("long", ("오늘 오전에는 문서를 정리하고 오후에는 회의에 참석했다. " * 30) + "퇴근 무렵 일을 마쳐서 뿌듯했고 동료의 따뜻한 편지에 감동했다.", "MIXED"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Send only the synthetic cases to the configured API.")
    args = parser.parse_args()
    if not args.live:
        raise SystemExit("Use --live explicitly; may incur API usage charges.")
    settings = get_settings()
    def evaluate(case):
        name, text, expected = case
        try:
            result = OpenAIEmotionAnalyzer(settings.openai_api_key, settings.openai_model).analyze(text)
            return {"case": name, "schema_and_quotes_valid": True, "expected_relationship": expected,
                "relationship_match": expected is None or result.relationship.type == expected,
                "result": result.model_dump(mode="json")}
        except EmotionAnalysisError as exc:
            return {"case": name, "schema_and_quotes_valid": False, "error_kind": exc.code, "error": "API or schema/evidence validation failed (no raw response logged)."}
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(evaluate, CASES))
    folder = Path(__file__).resolve().parents[2] / "tmp"
    folder.mkdir(exist_ok=True)
    (folder / "emotion-review-live-evaluation.json").write_text(json.dumps({"model": settings.openai_model, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"model": settings.openai_model, "cases": [{key: value for key, value in result.items() if key != "result"} for result in results]}, ensure_ascii=False))


if __name__ == "__main__": main()
