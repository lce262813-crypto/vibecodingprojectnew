"""Build five deterministic MOZI character prototypes from original silhouettes.

This is an approval-only prototype generator. It does not modify the production
character generation algorithm.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

CANVAS = 160
INK = (17, 17, 47, 255)
WHITE = (255, 255, 255, 255)

BODY_SOURCES = {
    "wide": "dugeuni.png",
    "soft": "seollemi.png",
    "low": "honrani.png",
    "tall": "geokjeongi.png",
}

PROTOTYPES = [
    {
        "id": "rage-fatigue",
        "name": "부글꾸벅",
        "seed": 71030,
        "body": {"template_id": "wide", "palette_id": "coral", "color": "#F8877E"},
        "expression": {"eyebrow_id": "angry", "eye_id": "half", "mouth_id": "crooked"},
        "emotion": {"primary": {"key": "anger", "intensity": 70}, "secondary": {"key": "fatigue", "intensity": 30}, "detail_state": "pressure"},
        "decoration": {"part_id": "coffee", "anchor": "right_hand"},
        "effect_parts": ["sweat"],
        "mutation": {"part_id": None},
        "description": "분노 눈썹과 피로한 반눈을 결합한 캐릭터",
    },
    {
        "id": "flutter-anxiety",
        "name": "콩닥초조",
        "seed": 65350,
        "body": {"template_id": "soft", "palette_id": "pink", "color": "#F8BCD0"},
        "expression": {"eyebrow_id": "worried", "eye_id": "sparkle", "mouth_id": "small_smile"},
        "emotion": {"primary": {"key": "excitement", "intensity": 65}, "secondary": {"key": "anxiety", "intensity": 35}, "detail_state": "anticipation"},
        "decoration": {"part_id": "hearts", "anchor": "top"},
        "effect_parts": ["sweat"],
        "mutation": {"part_id": "single_spot"},
        "description": "반짝이는 눈과 걱정 눈썹, 식은땀을 함께 표현",
    },
    {
        "id": "sad-lonely",
        "name": "비구름몽",
        "seed": 60400,
        "body": {"template_id": "tall", "palette_id": "sky", "color": "#A8C8F8"},
        "expression": {"eyebrow_id": "worried", "eye_id": "teary", "mouth_id": "frown"},
        "emotion": {"primary": {"key": "sadness", "intensity": 60}, "secondary": {"key": "loneliness", "intensity": 40}, "detail_state": "hurt_feelings"},
        "decoration": {"part_id": "rain_cloud", "anchor": "top"},
        "effect_parts": [],
        "mutation": {"part_id": None},
        "description": "처진 눈썹과 눈물, 작은 비구름을 조합",
    },
    {
        "id": "pride-fatigue",
        "name": "으쓱졸림",
        "seed": 70300,
        "body": {"template_id": "low", "palette_id": "yellow", "color": "#F8E078"},
        "expression": {"eyebrow_id": "confident", "eye_id": "half", "mouth_id": "smirk"},
        "emotion": {"primary": {"key": "pride", "intensity": 70}, "secondary": {"key": "fatigue", "intensity": 30}, "detail_state": "satisfaction"},
        "decoration": {"part_id": "crown", "anchor": "top"},
        "effect_parts": ["sparkle"],
        "mutation": {"part_id": None},
        "description": "졸린 눈을 유지하면서 자신감 있는 표정과 왕관을 사용",
    },
    {
        "id": "confused-lethargic",
        "name": "갸웃멍",
        "seed": 55450,
        "body": {"template_id": "tall", "palette_id": "lavender", "color": "#D0B0F0"},
        "expression": {"eyebrow_id": "asymmetric", "eye_id": "mixed", "mouth_id": "flat"},
        "emotion": {"primary": {"key": "confusion", "intensity": 55}, "secondary": {"key": "lethargy", "intensity": 45}, "detail_state": "mental_breakdown"},
        "decoration": {"part_id": "questions", "anchor": "top_sides"},
        "effect_parts": [],
        "mutation": {"part_id": "single_spot"},
        "description": "비대칭 눈썹과 서로 다른 눈, 힘없는 입을 조합",
    },
]


def largest_component(alpha: Image.Image) -> Image.Image:
    pixels = alpha.load()
    width, height = alpha.size
    seen: set[tuple[int, int]] = set()
    largest: list[tuple[int, int]] = []
    for start_y in range(height):
        for start_x in range(width):
            if pixels[start_x, start_y] == 0 or (start_x, start_y) in seen:
                continue
            queue = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                if (x, y) in seen or pixels[x, y] == 0:
                    continue
                seen.add((x, y))
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    mask = Image.new("L", alpha.size, 0)
    output = mask.load()
    for x, y in largest:
        output[x, y] = 255
    return mask


def body_template(source: Image.Image) -> Image.Image:
    mask = largest_component(source.getchannel("A"))
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("Body silhouette is empty")
    mask = mask.crop(bounds)
    positioned = Image.new("L", (CANVAS, CANVAS), 0)
    x = (CANVAS - mask.width) // 2
    y = 145 - mask.height
    positioned.paste(mask, (x, y))
    interior = positioned.filter(ImageFilter.MinFilter(9))
    outline = ImageChops.subtract(positioned, interior)
    result = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    result.paste(INK, mask=outline)
    result.paste(WHITE, mask=interior)
    return result


def line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], width: int = 5) -> None:
    draw.line(points, fill=INK, width=width)


def expression_layer(kind: str, part_id: str) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if kind == "eyebrows":
        if part_id == "angry":
            line(draw, [(48, 70), (68, 78)]); line(draw, [(92, 78), (112, 70)])
        elif part_id == "worried":
            line(draw, [(48, 78), (68, 70)]); line(draw, [(92, 70), (112, 78)])
        elif part_id == "confident":
            line(draw, [(48, 69), (68, 75)]); line(draw, [(92, 75), (112, 69)])
        elif part_id == "asymmetric":
            line(draw, [(48, 74), (68, 69)]); line(draw, [(92, 70), (112, 76)])
        else:
            line(draw, [(48, 72), (68, 72)]); line(draw, [(92, 72), (112, 72)])
    elif kind == "eyes":
        if part_id == "half":
            draw.rectangle((50, 85, 68, 90), fill=INK); draw.rectangle((92, 85, 110, 90), fill=INK)
        elif part_id == "sparkle":
            for center in (59, 101):
                draw.polygon([(center, 82), (center + 4, 88), (center + 10, 92), (center + 4, 96), (center, 103), (center - 4, 96), (center - 10, 92), (center - 4, 88)], fill=INK)
        elif part_id == "teary":
            draw.rectangle((53, 82, 64, 94), fill=INK); draw.rectangle((96, 82, 107, 94), fill=INK)
            draw.rectangle((54, 96, 60, 108), fill=(63, 153, 238, 255)); draw.rectangle((100, 96, 106, 108), fill=(63, 153, 238, 255))
        elif part_id == "mixed":
            draw.rectangle((52, 82, 64, 94), outline=INK, width=4)
            line(draw, [(94, 92), (101, 83), (108, 92)], 4)
        else:
            draw.rectangle((56, 86, 61, 91), fill=INK); draw.rectangle((99, 86, 104, 91), fill=INK)
    elif kind == "mouths":
        if part_id == "crooked":
            line(draw, [(61, 113), (70, 107), (80, 113), (90, 107), (99, 113)], 5)
        elif part_id == "small_smile":
            line(draw, [(68, 108), (74, 115), (86, 115), (92, 108)], 5)
        elif part_id == "frown":
            line(draw, [(63, 121), (70, 113), (80, 109), (90, 113), (97, 121)], 5)
        elif part_id == "smirk":
            line(draw, [(65, 115), (80, 115), (95, 108)], 5)
        else:
            draw.rectangle((68, 111, 92, 116), fill=INK)
    return image


def decoration_layer(part_id: str) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if part_id == "coffee":
        draw.rectangle((117, 105, 145, 133), fill=INK)
        draw.rectangle((121, 109, 141, 129), fill=(255, 250, 241, 255))
        draw.rectangle((124, 113, 138, 126), fill=(232, 185, 98, 255))
        line(draw, [(145, 111), (153, 111), (153, 126), (145, 126)], 4)
    elif part_id == "hearts":
        for offset in (29, 96):
            outer = [(offset + 4, 34), (offset + 9, 29), (offset + 17, 29), (offset + 22, 34), (offset + 27, 29), (offset + 35, 29), (offset + 40, 34), (offset + 40, 47), (offset + 34, 47), (offset + 34, 53), (offset + 28, 53), (offset + 28, 59), (offset + 22, 65), (offset + 16, 59), (offset + 16, 53), (offset + 10, 53), (offset + 10, 47), (offset + 4, 47)]
            inner = [(offset + 9, 36), (offset + 13, 33), (offset + 17, 33), (offset + 22, 39), (offset + 27, 33), (offset + 32, 33), (offset + 36, 37), (offset + 36, 44), (offset + 30, 50), (offset + 24, 56), (offset + 22, 60), (offset + 18, 56), (offset + 12, 50), (offset + 8, 44), (offset + 8, 38)]
            draw.polygon(outer, fill=INK)
            draw.polygon(inner, fill=(230, 54, 91, 255))
    elif part_id == "rain_cloud":
        draw.rectangle((44, 26, 112, 48), fill=INK)
        draw.rectangle((51, 19, 72, 53), fill=INK); draw.rectangle((73, 14, 95, 53), fill=INK)
        draw.rectangle((49, 30, 107, 46), fill=(177, 183, 205, 255))
        draw.rectangle((56, 24, 72, 46), fill=(190, 196, 215, 255)); draw.rectangle((74, 19, 92, 46), fill=(190, 196, 215, 255))
        for x in (55, 75, 95):
            line(draw, [(x, 53), (x - 6, 66)], 4)
    elif part_id == "crown":
        draw.polygon([(55, 58), (55, 30), (68, 43), (79, 25), (91, 43), (105, 30), (105, 58)], fill=INK)
        draw.polygon([(61, 53), (61, 41), (69, 49), (79, 34), (90, 49), (99, 41), (99, 53)], fill=(255, 211, 69, 255))
    elif part_id == "questions":
        for x in (23, 120):
            draw.rectangle((x, 8, x + 14, 13), fill=INK)
            draw.rectangle((x + 10, 13, x + 17, 25), fill=INK)
            draw.rectangle((x + 4, 25, x + 11, 35), fill=INK)
            draw.rectangle((x + 4, 43, x + 10, 49), fill=INK)
    return image


def effect_layer(part_id: str) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if part_id == "sweat":
        draw.polygon([(124, 72), (132, 58), (140, 72), (136, 80), (128, 80)], fill=(63, 153, 238, 255))
    elif part_id == "sparkle":
        draw.polygon([(124, 47), (128, 56), (137, 60), (128, 64), (124, 74), (120, 64), (111, 60), (120, 56)], fill=(255, 211, 69, 255), outline=INK)
    return image


def mutation_layer(part_id: str | None) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    if part_id == "single_spot":
        draw = ImageDraw.Draw(image)
        draw.rectangle((114, 106, 118, 110), fill=(255, 255, 255, 90))
    return image


def colorize(template: Image.Image, color: str) -> Image.Image:
    result = template.copy()
    pixels = result.load()
    fill = tuple(bytes.fromhex(color.removeprefix("#"))) + (255,)
    for y in range(CANVAS):
        for x in range(CANVAS):
            if pixels[x, y] == WHITE:
                pixels[x, y] = fill
    return result


def save_parts(output: Path) -> None:
    part_ids = {
        "eyebrows": ("angry", "worried", "confident", "asymmetric", "soft"),
        "eyes": ("half", "sparkle", "teary", "mixed", "blank"),
        "mouths": ("crooked", "small_smile", "frown", "smirk", "flat"),
    }
    for kind, identifiers in part_ids.items():
        directory = output / "parts" / kind
        directory.mkdir(parents=True, exist_ok=True)
        for part_id in identifiers:
            expression_layer(kind, part_id).save(directory / f"{part_id}.png")
    for group, identifiers, builder in (
        ("decorations", ("coffee", "hearts", "rain_cloud", "crown", "questions"), decoration_layer),
        ("effects", ("sweat", "sparkle"), effect_layer),
        ("mutations", ("single_spot",), mutation_layer),
    ):
        directory = output / "parts" / group
        directory.mkdir(parents=True, exist_ok=True)
        for part_id in identifiers:
            builder(part_id).save(directory / f"{part_id}.png")


def generate(source: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    body_dir = output / "bodies"
    example_dir = output / "examples"
    body_dir.mkdir(exist_ok=True)
    example_dir.mkdir(exist_ok=True)
    bodies: dict[str, Image.Image] = {}
    for body_id, filename in BODY_SOURCES.items():
        template = body_template(Image.open(source / filename).convert("RGBA"))
        template.save(body_dir / f"{body_id}.png")
        bodies[body_id] = template
    save_parts(output)

    for prototype in PROTOTYPES:
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        decoration_id = prototype["decoration"]["part_id"]
        canvas.alpha_composite(colorize(bodies[prototype["body"]["template_id"]], prototype["body"]["color"]))
        canvas.alpha_composite(decoration_layer(decoration_id))
        canvas.alpha_composite(mutation_layer(prototype["mutation"]["part_id"]))
        for kind, key in (("eyebrows", "eyebrow_id"), ("eyes", "eye_id"), ("mouths", "mouth_id")):
            canvas.alpha_composite(expression_layer(kind, prototype["expression"][key]))
        for effect in prototype["effect_parts"]:
            canvas.alpha_composite(effect_layer(effect))
        canvas.save(example_dir / f"{prototype['id']}.png")

    with (output / "prototypes.json").open("w", encoding="utf-8") as file:
        json.dump(PROTOTYPES, file, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    project = Path(__file__).resolve().parents[1]
    generate(
        project / "frontend" / "public" / "assets" / "characters",
        project / "frontend" / "public" / "assets" / "character-prototype",
    )
