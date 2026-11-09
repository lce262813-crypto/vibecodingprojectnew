"""Chooses the item a character holds from what the diary's analysis already saved.

The choice is made when a character is read, so characters from before items existed get one
too and no stored record changes. The analysis lists objects with the most central one first.
"""

from collections.abc import Iterable
from typing import Any

# Checked in order: a longer name must come before a word it contains (노트북 before 노트).
ITEM_WORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("coffee", ("커피", "카페", "라떼", "아메리카노", "에스프레소", "카푸치노", "모카")),
    ("bubbletea", ("버블티", "밀크티", "음료", "주스", "스무디", "에이드", "콜라", "녹차", "홍차", "코코아")),
    ("wine", ("와인", "포도주", "샴페인")),
    ("cocktail", ("칵테일", "하이볼", "모히또")),
    ("beer", ("맥주", "소주", "막걸리", "호프", "회식", "술자리", "건배")),
    ("donut", ("도넛", "도너츠")),
    ("icecream", ("아이스크림", "아이스바", "빙수", "젤라또")),
    ("cake", ("케이크", "케익", "생일", "디저트", "베이커리", "쿠키", "초콜릿")),
    ("pizza", ("피자",)),
    ("burger", ("햄버거", "버거", "감자튀김")),
    ("chicken", ("치킨", "닭강정", "닭다리")),
    ("sushi", ("초밥", "스시", "사시미")),
    ("fruit", ("과일", "사과", "바나나", "딸기", "수박", "복숭아", "포도", "귤")),
    ("meal", ("도시락", "식사", "점심", "저녁", "아침밥", "맛집", "요리", "김치찌개", "찌개", "국밥", "라면", "밥")),
    ("laptop", ("노트북", "컴퓨터", "코딩", "재택")),
    ("bag", ("여행 가방", "캐리어", "여행", "출장", "공항", "비행기", "캠핑", "휴가", "호텔", "기차")),
    ("briefcase", ("서류 가방", "회사", "출근", "퇴근", "업무", "회의", "직장", "상사", "프로젝트", "발표", "마감", "야근", "사무실", "가방")),
    ("plant", ("화분", "새싹", "분갈이", "식물")),
    ("flower", ("꽃다발", "꽃집", "벚꽃", "장미", "튤립", "산책", "공원", "정원", "꽃")),
    ("book", ("도서관", "독서", "공부", "시험", "소설", "교재", "문제집", "과제", "수업", "강의", "학원", "책")),
    ("letter", ("손편지", "편지", "엽서", "우편")),
    ("pencil", ("연필", "필기", "메모", "노트", "볼펜", "펜")),
    ("headphones", ("헤드폰", "이어폰", "플레이리스트", "콘서트", "공연", "음악", "노래")),
    ("gamepad", ("게임패드", "컨트롤러", "게임", "PC방")),
    ("medal", ("메달", "트로피", "우승", "합격", "1등", "완주", "대회")),
    ("sneaker", ("운동화", "운동", "헬스", "달리기", "러닝", "마라톤", "요가", "등산", "체육관")),
    ("beach", ("해변", "바닷가", "모래사장", "조개", "서핑")),
    ("key", ("열쇠", "키링", "차키")),
    ("house", ("자취", "이사", "본가", "집들이", "집")),
    ("money", ("월급", "용돈", "저축", "통장", "보너스", "동전", "돈")),
    ("shopping", ("쇼핑", "장보기", "백화점", "마트")),
    ("camera", ("카메라", "사진", "촬영", "셀카")),
    ("ticket", ("티켓", "영화표", "입장권", "영화", "뮤지컬", "연극", "전시")),
    ("umbrella", ("우산", "장마", "소나기", "폭우", "비")),
    ("sleepCap", ("수면", "낮잠", "침대", "베개", "늦잠", "불면", "잠")),
    ("gift", ("선물", "기념일", "택배")),
    ("phone", ("휴대폰", "핸드폰", "전화", "통화", "카톡", "문자")),
    ("medicine", ("감기약", "알약", "병원", "약국", "감기", "두통", "약")),
    ("paw", ("강아지", "고양이", "반려동물", "댕댕이", "냥이")),
    ("paintbrush", ("그림", "미술", "드로잉", "수채화", "스케치")),
    ("heart", ("사랑", "데이트", "연인", "고백", "친구", "가족")),
)

# Used when no keyword matched by name. 일상 is too broad to suggest anything.
CATEGORY_ITEMS: dict[str, str] = {
    "work": "briefcase",
    "study": "book",
    "drink": "coffee",
    "social": "heart",
    "nature": "flower",
    "travel": "bag",
    "health": "sneaker",
    "hobby": "headphones",
    "food": "meal",
}


def _matches(term: str, word: str) -> bool:
    # A one-letter word only counts alone: 산책 is not 책, and 약속 is not 약.
    return term == word if len(word) == 1 else word in term


def _item_named(term: str) -> str | None:
    text = term.strip()
    for item, words in ITEM_WORDS:
        if any(_matches(text, word) for word in words):
            return item
    return None


def _first_item(terms: Iterable[str]) -> str | None:
    return next((item for item in map(_item_named, terms) if item), None)


def item_for_analysis(analysis: Any | None) -> str | None:
    """The one item for a day: objects by name, then keywords by name, then keyword category."""
    if analysis is None:
        return None
    keywords = analysis.keywords or []
    named = _first_item([*(analysis.objects or []), *(keyword["text"] for keyword in keywords)])
    if named:
        return named
    return next((CATEGORY_ITEMS[k["category"]] for k in keywords if k["category"] in CATEGORY_ITEMS), None)


def item_for_encounter(encounter: Any) -> str | None:
    """Items saved on old records win; everything else comes from the diary's analysis."""
    return encounter.accessory_part or item_for_analysis(encounter.daily_entry.analysis)
