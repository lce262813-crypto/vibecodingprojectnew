from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.characters import (
    BODY_PARTS,
    EXPRESSION_RECIPES,
    MUTATION_PARTS,
    PALETTE_COLORS,
)
from app.models import Character, DailyEntry, DailyEntryStatus, Encounter, User
from app.schemas.emotions import BaseEmotionKey, KeywordCategory, KeywordResult
from app.services.character_generator import (
    build_fingerprint,
    create_character_encounter,
    level_for,
)
from app.services.characters import delete_encounter
from app.services.emotion_analysis import save_analysis
from tests.conftest import FakeEmotionAnalyzer


def make_user(db: Session, email: str, nickname: str) -> User:
    user = User(email=email, nickname=nickname, password_hash="test-hash")
    db.add(user)
    db.flush()
    return user


def make_entry(db: Session, user: User, day: date) -> DailyEntry:
    entry = DailyEntry(
        user_id=user.id,
        entry_date=day,
        diary_text="테스트를 위한 충분히 긴 오늘의 일기입니다.",
        status="analyzing",
    )
    db.add(entry)
    db.flush()
    return entry


def test_intensity_boundaries() -> None:
    assert [level_for(value) for value in (0, 19, 20, 39, 40, 59, 60, 79, 80, 100)] == [
        1, 1, 2, 2, 3, 3, 4, 4, 5, 5
    ]


def test_all_sixteen_emotions_have_expression_recipes() -> None:
    assert set(EXPRESSION_RECIPES) == set(BaseEmotionKey)
    assert all(len(recipe) == 3 for recipe in EXPRESSION_RECIPES.values())


def test_same_fingerprint_reuses_character_but_adds_encounter(
    db_session: Session,
    fake_analyzer: FakeEmotionAnalyzer,
) -> None:
    user = make_user(db_session, "same@example.com", "같은친구")
    payload = fake_analyzer.analyze("충분히 긴 테스트 일기입니다.")
    first_entry = make_entry(db_session, user, date(2026, 11, 1))
    second_entry = make_entry(db_session, user, date(2026, 11, 2))

    first_character, first_encounter, first_is_new = create_character_encounter(
        db_session, first_entry, payload
    )
    second_character, second_encounter, second_is_new = create_character_encounter(
        db_session, second_entry, payload
    )
    db_session.commit()

    assert first_is_new is True
    assert second_is_new is False
    assert first_character.id == second_character.id
    assert first_encounter.id != second_encounter.id
    assert db_session.scalar(select(func.count()).select_from(Character)) == 1
    assert db_session.scalar(select(func.count()).select_from(Encounter)) == 2


def test_keyword_accessory_does_not_change_fingerprint(
    fake_analyzer: FakeEmotionAnalyzer,
) -> None:
    payload = fake_analyzer.analyze("충분히 긴 테스트 일기입니다.")
    changed_keyword = payload.model_copy(
        update={
            "keywords": [
                KeywordResult(text="커피", category=KeywordCategory.DRINK)
            ]
        }
    )
    assert build_fingerprint(payload) == build_fingerprint(changed_keyword)


def test_different_users_receive_different_deterministic_appearance(
    db_session: Session,
    fake_analyzer: FakeEmotionAnalyzer,
) -> None:
    payload = fake_analyzer.analyze("충분히 긴 테스트 일기입니다.")
    first_user = make_user(db_session, "first@example.com", "첫친구")
    second_user = make_user(db_session, "second@example.com", "둘친구")
    first, _, _ = create_character_encounter(
        db_session, make_entry(db_session, first_user, date(2026, 11, 2)), payload
    )
    second, _, _ = create_character_encounter(
        db_session, make_entry(db_session, second_user, date(2026, 11, 2)), payload
    )

    assert first.seed != second.seed
    assert first.body_part in BODY_PARTS
    assert first.palette in PALETTE_COLORS
    assert first.mutation_part is None or first.mutation_part in MUTATION_PARTS


def test_deleting_one_of_multiple_encounters_keeps_character(
    db_session: Session,
    fake_analyzer: FakeEmotionAnalyzer,
) -> None:
    user = make_user(db_session, "history@example.com", "기록친구")
    payload = fake_analyzer.analyze("충분히 긴 테스트 일기입니다.")
    first_entry = make_entry(db_session, user, date(2026, 11, 1))
    second_entry = make_entry(db_session, user, date(2026, 11, 2))
    save_analysis(db_session, first_entry, payload, "demo")
    save_analysis(db_session, second_entry, payload, "demo")
    first_encounter = db_session.scalar(
        select(Encounter).where(Encounter.daily_entry_id == first_entry.id)
    )
    assert first_encounter is not None

    removed_character = delete_encounter(db_session, first_encounter)

    db_session.refresh(first_entry)
    db_session.refresh(second_entry)
    assert removed_character is False
    assert first_entry.status == DailyEntryStatus.DELETED.value
    assert second_entry.status == DailyEntryStatus.COMPLETED.value
    assert db_session.scalar(select(func.count()).select_from(Character)) == 1
    assert db_session.scalar(select(func.count()).select_from(Encounter)) == 1
