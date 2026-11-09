from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Character, DailyEntry, DailyEntryStatus, EmotionAnalysis, User
from app.schemas.personalization import BadgeListResponse, BadgeStatus
from app.services.reports import EMOTION_GROUPS


def badges_for(db: Session, user: User) -> BadgeListResponse:
    analyses = list(
        db.scalars(
            select(EmotionAnalysis)
            .join(DailyEntry, EmotionAnalysis.daily_entry_id == DailyEntry.id)
            .where(
                DailyEntry.user_id == user.id,
                DailyEntry.status == DailyEntryStatus.COMPLETED.value,
            )
        ).all()
    )
    diary_count = db.scalar(
        select(func.count()).select_from(DailyEntry).where(
            DailyEntry.user_id == user.id,
            DailyEntry.status.in_(["completed", "uncertain", "ai_failed", "awaiting_confirmation"]),
            DailyEntry.diary_text.is_not(None),
        )
    ) or 0
    character_count = db.scalar(
        select(func.count()).select_from(Character).where(Character.user_id == user.id)
    ) or 0
    discovered_groups = {
        group
        for analysis in analyses
        for group, (_, emotions) in EMOTION_GROUPS.items()
        if analysis.primary_emotion in emotions
    }
    complex_count = sum(1 for analysis in analyses if analysis.secondary_emotions)
    definitions = [
        ("first_diary", "첫 마음 기록", "처음으로 하루의 마음을 남겼어요.", diary_count, 1),
        ("seven_diaries", "일곱 번의 기록", "서두르지 않고 일곱 개의 기록을 모았어요.", diary_count, 7),
        ("thirty_diaries", "서른 번의 기록", "다양한 하루를 서른 개의 기록으로 남겼어요.", diary_count, 30),
        ("emotion_groups", "감정의 새 얼굴", "서로 다른 두 감정 그룹을 발견했어요.", len(discovered_groups), 2),
        ("complex_emotion", "겹쳐진 마음", "복합 감정 캐릭터를 처음 만났어요.", complex_count, 1),
        ("collection_goal", "도감 한 페이지", "서로 다른 캐릭터 12마리를 모았어요.", character_count, 12),
    ]
    return BadgeListResponse(
        badges=[
            BadgeStatus(
                badge_id=badge_id,
                name=name,
                description=description,
                earned=progress >= target,
                progress=min(progress, target),
                target=target,
            )
            for badge_id, name, description, progress, target in definitions
        ]
    )
