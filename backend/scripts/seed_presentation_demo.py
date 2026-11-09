"""Create an isolated, local-only showcase account with believable diary history.

Safe to rerun: an existing showcase account is never reset or modified.
"""
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models import Character, DailyEntry, EmotionAnalysis, User
from app.schemas.emotion_review import (
    ConfirmEmotionRequest,
    EmotionReview,
    EmotionRelationship,
    ReviewedEmotion,
)
from app.schemas.emotions import BaseEmotionKey
from app.services.clock import today_in_seoul
from app.services.emotion_review import confirm_review
from app.services.security import hash_password


EMAIL = "presentation@mozi-demo.com"
LEGACY_EMAIL = "presentation@mozi.test"
PASSWORD = "MoziDemo!2026"
NICKNAME = "모지 발표"

# days ago, title, diary text, (emotion, intensity, exact quote, event), relation,
# recommended emotion, and literal diary objects used for optional props.
DIARIES = [
    (1, "작은 성취", "오늘 발표 자료를 다 마쳤다. 마지막 슬라이드를 저장하고 나니 정말 뿌듯했다. 퇴근길에 좋아하는 라떼도 마셨다.", [("pride", 3, "정말 뿌듯했다", "발표 자료 완성")], "SINGLE", "pride", ["라떼"]),
    (3, "친구와 산책", "오랜만에 친구와 공원을 걸었다. 처음엔 조금 지쳤는데 같이 웃다 보니 기분이 한결 좋아졌다.", [("fatigue", 2, "조금 지쳤는데", "산책 전 피로"), ("joy", 3, "기분이 한결 좋아졌다", "친구와 산책")], "TRANSITION", "joy", []),
    (5, "기다리던 소식", "기다리던 연락이 왔다. 답장을 읽는 순간 가슴이 두근거리고 괜히 웃음이 났다.", [("excitement", 3, "가슴이 두근거리고", "기다리던 연락")], "SINGLE", "excitement", ["휴대폰"]),
    (8, "조용한 저녁", "일찍 집에 와서 따뜻한 차를 마셨다. 아무것도 서두르지 않아도 되는 저녁이라 마음이 편안했다.", [("calm", 2, "마음이 편안했다", "느긋한 저녁")], "SINGLE", "calm", ["차"]),
    (10, "시험 결과", "시험에 합격해서 기뻤다. 다음 단계가 조금 걱정되지만 오늘은 가족과 케이크를 먹으며 축하했다.", [("joy", 3, "기뻤다", "시험 합격"), ("anxiety", 2, "조금 걱정되지만", "다음 단계에 대한 걱정")], "MIXED", "joy", ["케이크"]),
    (12, "비 오는 날", "하루 종일 비가 내렸다. 보고 싶던 사람 생각이 나서 조금 허전했고, 집에 와서는 책을 읽으며 쉬었다.", [("loneliness", 2, "조금 허전했고", "보고 싶은 사람 생각")], "SINGLE", "loneliness", ["책"]),
    (15, "뜻밖의 선물", "친구가 작은 꽃다발을 건네줬다. 예상하지 못한 마음에 감동해서 한참 들여다봤다.", [("moved", 3, "감동해서", "친구의 꽃다발")], "SINGLE", "moved", ["꽃다발"]),
    (18, "야근 후 커피", "업무가 늦게 끝나서 피곤했다. 그래도 동료가 챙겨준 따뜻한 커피를 마시며 오늘 할 일을 마무리했다.", [("fatigue", 3, "피곤했다", "늦은 업무"), ("moved", 2, "챙겨준 따뜻한 커피", "동료의 배려")], "CONTRAST", "fatigue", ["커피"]),
    (21, "마음이 복잡한 하루", "여러 생각이 한꺼번에 들어와서 마음이 복잡했다. 산책하고 돌아오니 조금 차분해졌다.", [("confusion", 2, "마음이 복잡했다", "많은 생각"), ("calm", 2, "조금 차분해졌다", "산책 후")], "TRANSITION", "calm", []),
    (24, "오랜만의 영화", "친구와 영화를 보고 맛있는 저녁을 먹었다. 별일 없는 하루였지만 꽤 즐거웠다.", [("joy", 2, "꽤 즐거웠다", "친구와 영화")], "SINGLE", "joy", ["영화"]),
    (27, "괜찮아지는 중", "계획이 틀어져서 실망했지만, 천천히 다시 정리하면 될 것 같다. 오늘은 일찍 쉬기로 했다.", [("disappointment", 2, "실망했지만", "계획 변경"), ("calm", 1, "천천히 다시 정리하면 될 것 같다", "마음 추스르기")], "MIXED", "disappointment", []),
    (30, "작은 용기", "처음 가는 모임이라 긴장했지만 먼저 인사를 건넸다. 생각보다 다정한 사람들이라 안심했다.", [("anxiety", 2, "긴장했지만", "처음 가는 모임"), ("calm", 2, "안심했다", "모임에서 만난 사람들")], "TRANSITION", "calm", []),
    (33, "주말의 여유", "좋아하는 음악을 틀어놓고 방을 정리했다. 마음이 가벼워져서 오후 내내 여유롭게 보냈다.", [("calm", 2, "여유롭게 보냈다", "음악과 정리")], "SINGLE", "calm", ["음악"]),
    (36, "고마운 한마디", "힘든 날이었는데 친구가 괜찮냐고 물어봐 줬다. 그 한마디가 고마워서 마음이 조금 따뜻해졌다.", [("sadness", 2, "힘든 날이었는데", "바쁜 하루"), ("moved", 2, "마음이 조금 따뜻해졌다", "친구의 안부")], "CONTRAST", "moved", []),
]

MONTHLY_DETAILS = [
    "점심에는 회사 근처의 작은 식당에서 따뜻한 국수를 먹었다.",
    "퇴근길에 평소보다 한 정거장 먼저 내려 천천히 걸었다.",
    "집에 와서 밀린 빨래를 개고 방을 조금 정리했다.",
    "오랜만에 가족과 통화하며 이런저런 이야기를 나눴다.",
    "카페 창가 자리에 앉아 읽던 책을 몇 장 더 읽었다.",
    "저녁 메뉴를 고민하다가 좋아하는 음식을 포장해 왔다.",
    "하늘이 맑아서 집 앞 골목을 잠깐 산책했다.",
    "친구가 보내 준 사진을 보며 지난 여행을 떠올렸다.",
    "책상 위를 정리하고 내일 할 일을 짧게 적어 뒀다.",
    "점심시간에 동료와 요즘 보는 드라마 이야기를 했다.",
    "장을 보고 돌아오는 길에 좋아하는 빵을 하나 샀다.",
    "저녁에는 음악을 틀어 놓고 간단한 요리를 했다.",
    "바람이 선선해서 잠깐 창문을 열어 두었다.",
    "미뤄 둔 연락을 몇 군데 하고 나니 마음이 가벼웠다.",
    "주말에 갈 곳을 찾아보다가 작은 전시를 발견했다.",
    "점심으로 새로운 메뉴를 먹어 봤는데 생각보다 괜찮았다.",
    "하루 동안 찍은 사진을 정리하며 기억을 되짚었다.",
    "잠깐 스트레칭을 하고 따뜻한 물을 마셨다.",
    "친구와 다음에 같이 가고 싶은 곳을 이야기했다.",
    "저녁 산책 중 동네 강아지가 반갑게 꼬리를 흔들었다.",
    "주말에 입을 옷과 가방을 미리 챙겨 두었다.",
    "점심시간에 햇볕이 드는 벤치에서 잠시 쉬었다.",
    "다 읽은 책을 책장에 꽂고 다음에 읽을 책을 골랐다.",
    "오늘은 배달 대신 집에 있는 재료로 저녁을 만들었다.",
    "오래 연락하지 못한 친구에게 먼저 안부를 물었다.",
    "퇴근하고 따뜻한 차를 마시며 좋아하는 영상을 봤다.",
    "가방 안을 정리하다가 잊고 있던 메모를 발견했다.",
    "창밖으로 노을이 예쁘게 보여 잠시 사진을 찍었다.",
    "내일 아침이 바쁘지 않도록 필요한 물건을 챙겨 뒀다.",
    "하루를 마무리하며 오늘 고마웠던 일을 하나 떠올렸다.",
    "잠들기 전에 알람을 맞추고 휴대폰을 내려놓았다.",
]


def monthly_diaries(today: date):
    """Add one synthetic but varied diary for each day of the last full month."""
    last_day = today.replace(day=1) - timedelta(days=1)
    _, count = monthrange(last_day.year, last_day.month)
    for day in range(1, count + 1):
        template = DIARIES[(day - 1) % len(DIARIES)]
        _, title, text, emotions, relation, recommendation, objects = template
        yield (
            date(last_day.year, last_day.month, day),
            f"{last_day.month}월 {day}일 · {title}",
            f"{text} {MONTHLY_DETAILS[day - 1]}",
            emotions,
            relation,
            recommendation,
            objects,
        )


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == EMAIL))
        if user is None:
            # Migrate only the isolated account this script itself created during setup.
            user = db.scalar(select(User).where(User.email == LEGACY_EMAIL))
            if user is not None:
                user.email = EMAIL
                db.flush()
        if user is None:
            user = User(
                email=EMAIL,
                password_hash=hash_password(PASSWORD),
                nickname=NICKNAME,
                coins=0,
                tutorial_completed_at=datetime.now(timezone.utc),
                tutorial_step=4,
            )
            db.add(user)
            db.flush()
        else:
            print("Showcase account exists; filling only missing sample dates.")
        today = today_in_seoul()
        character_ids = []

        recent_diaries = [
            (today - timedelta(days=days_ago), title, text, emotions, relation, recommendation, objects)
            for days_ago, title, text, emotions, relation, recommendation, objects in DIARIES
        ]
        for entry_date, title, text, emotion_rows, relation_type, recommendation, objects in [
            *monthly_diaries(today), *recent_diaries,
        ]:
            existing_entry = db.scalar(select(DailyEntry).where(
                DailyEntry.user_id == user.id,
                DailyEntry.entry_date == entry_date,
            ))
            if existing_entry:
                if existing_entry.encounter:
                    character_ids.append(existing_entry.encounter.character_id)
                continue
            entry = DailyEntry(
                user_id=user.id,
                entry_date=entry_date,
                title=title,
                diary_text=text,
                status="awaiting_confirmation",
                analysis_mode="demo",
            )
            db.add(entry)
            db.flush()

            reviewed = []
            for key, intensity, quote, event in emotion_rows:
                start = text.index(quote)
                reviewed.append(ReviewedEmotion(
                    emotion=BaseEmotionKey(key),
                    intensity=intensity,
                    source="ai",
                    evidence=quote,
                    evidence_start=start,
                    evidence_end=start + len(quote),
                    event=event,
                    explanation=f"일기에 ‘{quote}’라고 적혀 있어요.",
                ))
            emotion_keys = [item.emotion for item in reviewed]
            relation = EmotionRelationship(
                type=relation_type,
                sequence=emotion_keys if relation_type == "TRANSITION" else [],
                explanation="일기에 적힌 표현을 바탕으로 정리한 데모 분석이에요.",
            )
            review = EmotionReview(
                status="analyzed",
                emotions=reviewed,
                relationship=relation,
                recommended_emotion=BaseEmotionKey(recommendation),
                selected_emotion=BaseEmotionKey(recommendation),
                objects=objects,
            )
            db.add(EmotionAnalysis(
                daily_entry_id=entry.id,
                schema_version=3,
                base_emotions={},
                primary_emotion=None,
                ai_original=review.model_dump(mode="json"),
                review=review.model_dump(mode="json"),
                review_revision=1,
                secondary_emotions=[],
                primary_ratio=None,
                secondary_ratio=None,
                detail_states=[],
                energy=50,
                keywords=[],
                event_summary=relation.explanation,
                reason=relation.explanation,
                events=[item.event for item in reviewed],
                objects=objects,
                confidence=75,
                uncertainty_note=None,
                display_emotions=[],
                analysis_mode="demo",
                provider="demo_seed",
                model_name=None,
                prompt_version="presentation-demo-v1",
                is_user_edited=False,
            ))
            db.flush()
            confirm_review(db, entry, ConfirmEmotionRequest(revision=1, selected_emotion=BaseEmotionKey(recommendation)))
            db.refresh(entry)
            character_ids.append(entry.encounter.character_id)

        resident_ids = list(dict.fromkeys(character_ids))[:3]
        for character_id in resident_ids:
            character = db.get(Character, character_id)
            if character:
                character.is_resident = True
        db.commit()
        total_entries = len(user.daily_entries)
        total_characters = len(user.characters)
        print(f"Showcase account now has {total_entries} diaries and {total_characters} characters.")
        print(f"Previous full month ({(today.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')}) is populated day by day.")
        print(f"Login: {EMAIL} / {PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
