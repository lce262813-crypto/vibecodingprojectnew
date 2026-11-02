from app.schemas.emotions import BaseEmotionKey, DetailStateKey, KeywordCategory

ALGORITHM_VERSION = "v4"

BODY_PARTS = ("basic",)
MUTATION_PARTS = ("single_spot",)

PALETTE_COLORS = {
    "sunny": "#F6CF65",
    "peach": "#F39A78",
    "rose": "#F3A9C8",
    "mint": "#A9D7C3",
    "sky": "#AFC9EE",
    "lavender": "#C2AFE8",
    "aqua": "#A8E1E0",
    "slate": "#B8B8C8",
}

EMOTION_PALETTES = {
    BaseEmotionKey.JOY: ("sunny", "peach", "rose"),
    BaseEmotionKey.EXCITEMENT: ("rose", "peach", "lavender"),
    BaseEmotionKey.CALM: ("mint", "aqua", "sky"),
    BaseEmotionKey.PRIDE: ("sunny", "peach", "lavender"),
    BaseEmotionKey.MOVED: ("sky", "rose", "aqua"),
    BaseEmotionKey.SADNESS: ("sky", "slate", "lavender"),
    BaseEmotionKey.ANGER: ("peach", "rose", "sunny"),
    BaseEmotionKey.IRRITATION: ("peach", "lavender", "slate"),
    BaseEmotionKey.ANXIETY: ("lavender", "sky", "slate"),
    BaseEmotionKey.LONELINESS: ("sky", "slate", "aqua"),
    BaseEmotionKey.DISAPPOINTMENT: ("slate", "sky", "lavender"),
    BaseEmotionKey.EMBARRASSMENT: ("peach", "rose", "sunny"),
    BaseEmotionKey.CONFUSION: ("lavender", "sunny", "aqua"),
    BaseEmotionKey.SHYNESS: ("rose", "peach", "lavender"),
    BaseEmotionKey.FATIGUE: ("slate", "sky", "lavender"),
    BaseEmotionKey.LETHARGY: ("slate", "mint", "sky"),
}

# 모든 기본 감정은 전용 표정 조합을 가진다.
EXPRESSION_RECIPES = {
    BaseEmotionKey.JOY: ("brow_soft", "eye_smile", "mouth_laugh"),
    BaseEmotionKey.EXCITEMENT: ("brow_up", "eye_sparkle", "mouth_open_smile"),
    BaseEmotionKey.CALM: ("brow_soft", "eye_closed", "mouth_soft_smile"),
    BaseEmotionKey.PRIDE: ("brow_confident", "eye_confident", "mouth_smirk"),
    BaseEmotionKey.MOVED: ("brow_soft", "eye_watery", "mouth_soft_smile"),
    BaseEmotionKey.SADNESS: ("brow_sad", "eye_teary", "mouth_frown"),
    BaseEmotionKey.ANGER: ("brow_angry", "eye_glare", "mouth_shout"),
    BaseEmotionKey.IRRITATION: ("brow_low", "eye_side", "mouth_crooked"),
    BaseEmotionKey.ANXIETY: ("brow_worry", "eye_shaky", "mouth_wavy"),
    BaseEmotionKey.LONELINESS: ("brow_sad", "eye_down", "mouth_small"),
    BaseEmotionKey.DISAPPOINTMENT: ("brow_low", "eye_down", "mouth_frown"),
    BaseEmotionKey.EMBARRASSMENT: ("brow_up", "eye_wide", "mouth_o"),
    BaseEmotionKey.CONFUSION: ("brow_asym", "eye_mixed", "mouth_wavy"),
    BaseEmotionKey.SHYNESS: ("brow_soft", "eye_down", "mouth_small_smile"),
    BaseEmotionKey.FATIGUE: ("brow_flat", "eye_half", "mouth_flat"),
    BaseEmotionKey.LETHARGY: ("brow_flat", "eye_blank", "mouth_flat"),
}

BEHAVIOR_TYPES = {
    BaseEmotionKey.JOY: "active",
    BaseEmotionKey.EXCITEMENT: "active",
    BaseEmotionKey.CALM: "calm",
    BaseEmotionKey.PRIDE: "active",
    BaseEmotionKey.MOVED: "calm",
    BaseEmotionKey.SADNESS: "still",
    BaseEmotionKey.ANGER: "agitated",
    BaseEmotionKey.IRRITATION: "agitated",
    BaseEmotionKey.ANXIETY: "unstable",
    BaseEmotionKey.LONELINESS: "still",
    BaseEmotionKey.DISAPPOINTMENT: "still",
    BaseEmotionKey.EMBARRASSMENT: "unstable",
    BaseEmotionKey.CONFUSION: "unstable",
    BaseEmotionKey.SHYNESS: "calm",
    BaseEmotionKey.FATIGUE: "tired",
    BaseEmotionKey.LETHARGY: "still",
}

ACCESSORY_PARTS = {
    KeywordCategory.WORK: "briefcase",
    KeywordCategory.STUDY: "book",
    KeywordCategory.DRINK: "cup",
    KeywordCategory.SOCIAL: "heart",
    KeywordCategory.NATURE: "leaf",
    KeywordCategory.TRAVEL: "bag",
    KeywordCategory.HEALTH: "bandage",
    KeywordCategory.HOBBY: "gamepad",
    KeywordCategory.FOOD: "snack",
    KeywordCategory.DAILY: "sparkle",
}

EMOTION_EFFECTS = {
    BaseEmotionKey.JOY: "sparkles",
    BaseEmotionKey.EXCITEMENT: "hearts",
    BaseEmotionKey.CALM: "music",
    BaseEmotionKey.PRIDE: "crown_glow",
    BaseEmotionKey.MOVED: "tear_glow",
    BaseEmotionKey.SADNESS: "tears",
    BaseEmotionKey.ANGER: "flame",
    BaseEmotionKey.IRRITATION: "anger_mark",
    BaseEmotionKey.ANXIETY: "sweat",
    BaseEmotionKey.LONELINESS: "small_cloud",
    BaseEmotionKey.DISAPPOINTMENT: "gloom",
    BaseEmotionKey.EMBARRASSMENT: "sweat",
    BaseEmotionKey.CONFUSION: "question",
    BaseEmotionKey.SHYNESS: "blush",
    BaseEmotionKey.FATIGUE: "sleep",
    BaseEmotionKey.LETHARGY: "gloom",
}

DETAIL_EFFECTS = {
    DetailStateKey.MENTAL_BREAKDOWN: "spiral",
    DetailStateKey.PRESSURE: "sweat",
    DetailStateKey.FEAR: "sweat",
    DetailStateKey.ANTICIPATION: "sparkles",
    DetailStateKey.RELIEF: "breath",
    DetailStateKey.CURIOSITY: "question",
    DetailStateKey.CONFIDENCE: "crown_glow",
}

NAME_PREFIXES = {
    BaseEmotionKey.JOY: ("두근", "방긋", "해피"),
    BaseEmotionKey.EXCITEMENT: ("콩닥", "설렘", "반짝"),
    BaseEmotionKey.CALM: ("평온", "느긋", "포근"),
    BaseEmotionKey.PRIDE: ("뿌듯", "당당", "으쓱"),
    BaseEmotionKey.MOVED: ("촉촉", "감동", "몽글"),
    BaseEmotionKey.SADNESS: ("울먹", "주룩", "시무룩"),
    BaseEmotionKey.ANGER: ("버럭", "부글", "화끈"),
    BaseEmotionKey.IRRITATION: ("삐딱", "까칠", "툴툴"),
    BaseEmotionKey.ANXIETY: ("걱정", "조마", "초조"),
    BaseEmotionKey.LONELINESS: ("외톨", "쓸쓸", "고요"),
    BaseEmotionKey.DISAPPOINTMENT: ("축처", "실망", "풀이"),
    BaseEmotionKey.EMBARRASSMENT: ("화들", "깜짝", "당황"),
    BaseEmotionKey.CONFUSION: ("혼란", "갸웃", "빙글"),
    BaseEmotionKey.SHYNESS: ("수줍", "발그레", "소곤"),
    BaseEmotionKey.FATIGUE: ("녹초", "꾸벅", "졸린"),
    BaseEmotionKey.LETHARGY: ("멍때", "늘어", "무념"),
}

NAME_SUFFIXES = ("이", "몽", "콩", "링", "뭉")
