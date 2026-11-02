"""Room furniture sold in the shop and the coins earned from diaries."""

DIARY_REWARD_COINS = 100
NEW_CHARACTER_BONUS_COINS = 50

# Shop tabs, in display order.
SHOP_CATEGORIES: dict[str, str] = {
    "wall": "벽 장식",
    "window": "창문",
    "furniture": "가구",
    "props": "소품·조명",
    "floor": "바닥",
}

# item_id matches frontend/public/assets/room/furniture/{item_id}.png and the
# catalog order is the stacking order of the layers in the room. Every item
# has a fixed spot (slot); only one item per slot can be placed at a time.
FURNITURE_CATALOG: dict[str, dict[str, str | int]] = {
    "picture": {"name": "하트 액자", "description": "벽에 작은 하트를 걸어요.", "price": 100, "category": "wall", "slot": "wall_left"},
    "picture_star": {"name": "별 액자", "description": "반짝이는 별 하나를 걸어요.", "price": 120, "category": "wall", "slot": "wall_left"},
    "poster": {"name": "몬스터 포스터", "description": "젤리 몬스터가 그려진 포스터예요.", "price": 180, "category": "wall", "slot": "wall_left"},
    "clock": {"name": "동그란 벽시계", "description": "째깍째깍, 시간을 알려 줘요.", "price": 150, "category": "wall", "slot": "wall_right"},
    "mirror": {"name": "타원 거울", "description": "오늘의 표정을 비춰 봐요.", "price": 200, "category": "wall", "slot": "wall_right"},
    "curtains": {"name": "분홍 커튼", "description": "창문을 포근하게 감싸 줘요.", "price": 100, "category": "window", "slot": "window"},
    "curtains_sky": {"name": "하늘 커튼", "description": "산뜻한 하늘색 커튼이에요.", "price": 120, "category": "window", "slot": "window"},
    "blinds": {"name": "롤 블라인드", "description": "햇빛을 살짝 가려 줘요.", "price": 150, "category": "window", "slot": "window"},
    "lamp": {"name": "스탠드 조명", "description": "침대 옆을 은은하게 밝혀요.", "price": 180, "category": "props", "slot": "lamp"},
    "lamp_mushroom": {"name": "버섯 조명", "description": "빨간 버섯 모양 무드등이에요.", "price": 220, "category": "props", "slot": "lamp"},
    "bed": {"name": "보라 이불 침대", "description": "피곤한 몬스터가 쉬어 갈 침대예요.", "price": 400, "category": "furniture", "slot": "bed"},
    "bed_yellow": {"name": "노랑 이불 침대", "description": "햇살 같은 노란 이불이에요.", "price": 400, "category": "furniture", "slot": "bed"},
    "bed_mint": {"name": "민트 이불 침대", "description": "시원한 민트색 이불이에요.", "price": 400, "category": "furniture", "slot": "bed"},
    "bookshelf": {"name": "알록달록 책장", "description": "색색의 책이 가득한 책장이에요.", "price": 300, "category": "furniture", "slot": "right"},
    "wardrobe": {"name": "나무 옷장", "description": "몬스터들의 옷을 넣어 둬요.", "price": 320, "category": "furniture", "slot": "right"},
    "tv": {"name": "레트로 TV", "description": "화면 속에도 몬스터가 있어요.", "price": 500, "category": "furniture", "slot": "right"},
    "plant": {"name": "초록 화분", "description": "방에 싱그러움을 더해요.", "price": 150, "category": "props", "slot": "plant"},
    "cactus": {"name": "꽃 핀 선인장", "description": "작은 분홍 꽃이 피었어요.", "price": 160, "category": "props", "slot": "plant"},
    "sunflower": {"name": "해바라기 화분", "description": "늘 해를 바라보는 해바라기예요.", "price": 200, "category": "props", "slot": "plant"},
    "rug": {"name": "몽글 러그", "description": "몬스터들이 뛰놀 폭신한 러그예요.", "price": 200, "category": "floor", "slot": "rug"},
    "rug_check": {"name": "체크 러그", "description": "하늘색 체크무늬 러그예요.", "price": 220, "category": "floor", "slot": "rug"},
    "rug_rainbow": {"name": "무지개 러그", "description": "일곱 빛깔 기분이 담긴 러그예요.", "price": 280, "category": "floor", "slot": "rug"},
    "cushion": {"name": "방석 쿠션", "description": "바닥에 앉아 쉬기 좋아요.", "price": 120, "category": "floor", "slot": "floor_left"},
    "toybox": {"name": "장난감 상자", "description": "공이 빼꼼 나와 있어요.", "price": 180, "category": "floor", "slot": "floor_left"},
}
