from app.schemas.emotions import BaseEmotionKey

DIALOGUES = {
    BaseEmotionKey.JOY: ("오늘의 좋은 기분을 오래 간직하고 싶어!", "같이 웃으면 더 즐거워!"),
    BaseEmotionKey.EXCITEMENT: ("두근두근, 뭔가 멋진 일이 생길 것 같아!", "가만히 있기엔 너무 설레!"),
    BaseEmotionKey.CALM: ("천천히 쉬어 가도 괜찮아.", "지금 이 평온함이 좋아."),
    BaseEmotionKey.PRIDE: ("오늘 해낸 일을 마음껏 칭찬해 줘!", "우리 꽤 멋지게 해냈어."),
    BaseEmotionKey.MOVED: ("마음이 몽글몽글해졌어.", "따뜻한 순간을 기억할래."),
    BaseEmotionKey.SADNESS: ("슬픈 마음도 잠시 여기 머물러도 돼.", "오늘은 천천히 곁에 있어 줘."),
    BaseEmotionKey.ANGER: ("부글부글한 마음을 안전하게 식혀 보자!", "잠깐 숨을 크게 쉬어 볼까?"),
    BaseEmotionKey.IRRITATION: ("오늘은 조금 까칠해도 이해해 줘.", "잠시 혼자 쉬면 나아질지도 몰라."),
    BaseEmotionKey.ANXIETY: ("걱정이 많아도 한 걸음씩 가면 돼.", "주변을 살펴보고 천천히 움직일래."),
    BaseEmotionKey.LONELINESS: ("잠깐 내 옆에 있어 줄래?", "조용한 동행도 큰 힘이 돼."),
    BaseEmotionKey.DISAPPOINTMENT: ("기대한 만큼 속상할 수 있어.", "조금 쉬고 다시 생각해 보자."),
    BaseEmotionKey.EMBARRASSMENT: ("앗, 깜짝 놀랐어!", "잠깐 마음을 가다듬을 시간이 필요해."),
    BaseEmotionKey.CONFUSION: ("어느 쪽으로 가야 하지?", "하나씩 정리하면 길이 보일 거야."),
    BaseEmotionKey.SHYNESS: ("조금 부끄럽지만 반가워.", "천천히 친해지면 좋겠어."),
    BaseEmotionKey.FATIGUE: ("오늘은 아무것도 안 하고 쉬고 싶어…", "꾸벅꾸벅, 잠깐 눈을 붙일래."),
    BaseEmotionKey.LETHARGY: ("지금은 가만히 있어도 괜찮아.", "작은 일 하나만 해도 충분해."),
}
