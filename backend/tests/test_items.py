from types import SimpleNamespace

import pytest

from app.services.items import ITEM_WORDS, item_for_analysis, item_for_encounter


def analysis(objects=(), keywords=()):
    return SimpleNamespace(
        objects=list(objects),
        keywords=[{"text": text, "category": category} for text, category in keywords],
    )


@pytest.mark.parametrize("word, item", [
    ("커피", "coffee"), ("라떼", "coffee"), ("맥주", "beer"), ("소주", "beer"),
    ("꽃다발", "flower"), ("노트북", "laptop"), ("노트", "pencil"), ("여행 가방", "bag"),
    ("아이스크림", "icecream"), ("도넛", "donut"), ("버블티", "bubbletea"), ("생일 케이크", "cake"),
])
def test_finds_the_item_by_name(word, item):
    assert item_for_analysis(analysis([word])) == item


@pytest.mark.parametrize("word", ["약속", "비밀", "책임", "집중", "오늘"])
def test_a_one_letter_word_does_not_match_inside_another_word(word):
    assert item_for_analysis(analysis([word])) is None


def test_a_walk_is_not_a_book():
    assert item_for_analysis(analysis(["산책"])) == "flower"


def test_the_first_object_wins_because_the_most_central_comes_first():
    assert item_for_analysis(analysis(["맥주", "커피"])) == "beer"
    assert item_for_analysis(analysis(["의자", "커피"])) == "coffee"


def test_objects_come_before_keywords_and_names_before_categories():
    assert item_for_analysis(analysis(["커피"], [("피자", "food")])) == "coffee"
    assert item_for_analysis(analysis([], [("모임", "social"), ("피자", "food")])) == "pizza"


def test_an_unknown_keyword_falls_back_to_its_category():
    assert item_for_analysis(analysis([], [("모임", "social")])) == "heart"


def test_no_item_when_nothing_fits():
    assert item_for_analysis(analysis([], [("하루", "daily")])) is None
    assert item_for_analysis(analysis()) is None
    assert item_for_analysis(None) is None


def test_old_analyses_without_lists_are_safe():
    assert item_for_analysis(SimpleNamespace(objects=None, keywords=None)) is None


def test_a_saved_item_is_kept():
    record = analysis(["커피"])
    saved = SimpleNamespace(accessory_part="book", daily_entry=SimpleNamespace(analysis=record))
    unsaved = SimpleNamespace(accessory_part=None, daily_entry=SimpleNamespace(analysis=record))
    assert item_for_encounter(saved) == "book"
    assert item_for_encounter(unsaved) == "coffee"


def test_every_word_belongs_to_one_item():
    words = [word for _, group in ITEM_WORDS for word in group]
    assert len(words) == len(set(words))
