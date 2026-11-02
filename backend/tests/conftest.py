from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app import models  # noqa: F401
from app.api.diary import get_live_analyzer
from app.schemas.emotions import (
    BaseEmotionKey,
    BaseEmotionScores,
    DetailStateKey,
    DetailStateResult,
    EmotionAnalysisPayload,
    KeywordCategory,
    KeywordResult,
)
from app.services.openai_analysis import EmotionAnalysisError

test_engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine, autoflush=False, expire_on_commit=False
)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class FakeEmotionAnalyzer:
    def __init__(self) -> None:
        self.should_fail = False
        self.calls = 0

    def analyze(self, diary_text: str) -> EmotionAnalysisPayload:
        self.calls += 1
        if self.should_fail:
            raise EmotionAnalysisError("fake analysis failure")
        return EmotionAnalysisPayload(
            base_emotions=BaseEmotionScores(
                joy=78,
                excitement=52,
                calm=18,
                pride=10,
                moved=12,
                sadness=4,
                anger=2,
                irritation=6,
                anxiety=24,
                loneliness=3,
                disappointment=2,
                embarrassment=8,
                confusion=7,
                shyness=9,
                fatigue=14,
                lethargy=3,
            ),
            primary_emotion=BaseEmotionKey.JOY,
            secondary_emotions=[BaseEmotionKey.EXCITEMENT, BaseEmotionKey.ANXIETY],
            detail_states=[
                DetailStateResult(key=DetailStateKey.ANTICIPATION, confidence=72)
            ],
            energy=68,
            keywords=[KeywordResult(text="친구", category=KeywordCategory.SOCIAL)],
            event_summary="친구와의 즐거운 시간에서 기쁨과 설렘을 느낌",
        )


fake_emotion_analyzer = FakeEmotionAnalyzer()
app.dependency_overrides[get_live_analyzer] = lambda: fake_emotion_analyzer


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    fake_emotion_analyzer.should_fail = False
    fake_emotion_analyzer.calls = 0
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def fake_analyzer() -> FakeEmotionAnalyzer:
    return fake_emotion_analyzer
