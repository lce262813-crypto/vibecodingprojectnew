"""Generate the weather seen through the emotion room window.

Each layer is a transparent 192x108 canvas (same as the room) that repaints
only the four glass panes, so it stacks between the empty room and furniture
such as curtains. Rain, snow and storm get a second frame that the frontend
alternates to animate the window.
"""

from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw

from generate_room_background import HEIGHT, SCALE, WIDTH, save

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "frontend/public/assets/room/weather"

GLASS = (81, 12, 111, 38)
PANES = ((81, 12, 94, 23), (98, 12, 111, 23), (81, 27, 94, 38), (98, 27, 111, 38))

Color = tuple[int, int, int]

TIMES = ("dawn", "day", "sunset", "night")

# (top, middle, bottom) bands of each sky, so dawn and sunset get a gradient.
SKIES: dict[tuple[str, str], tuple[Color, Color, Color]] = {
    ("clear", "dawn"): ((120, 140, 200), (230, 180, 200), (255, 214, 170)),
    ("clear", "day"): ((150, 210, 240), (176, 222, 243), (200, 236, 245)),
    ("clear", "sunset"): ((110, 90, 170), (240, 130, 120), (255, 190, 110)),
    ("clear", "night"): ((24, 30, 70), (34, 42, 86), (58, 68, 118)),
    ("cloudy", "dawn"): ((150, 150, 180), (200, 180, 195), (220, 200, 200)),
    ("cloudy", "day"): ((176, 192, 206), (190, 203, 215), (204, 214, 224)),
    ("cloudy", "sunset"): ((120, 110, 150), (200, 140, 140), (225, 170, 140)),
    ("cloudy", "night"): ((44, 50, 72), (50, 56, 78), (68, 74, 96)),
    ("rain", "dawn"): ((110, 115, 140), (140, 140, 160), (160, 155, 170)),
    ("rain", "day"): ((140, 150, 166), (154, 163, 178), (168, 176, 190)),
    ("rain", "sunset"): ((95, 90, 120), (140, 115, 125), (165, 135, 130)),
    ("rain", "night"): ((30, 34, 54), (36, 40, 60), (50, 56, 76)),
    ("snow", "dawn"): ((170, 175, 205), (215, 200, 215), (230, 215, 220)),
    ("snow", "day"): ((198, 208, 222), (210, 218, 229), (222, 228, 236)),
    ("snow", "sunset"): ((140, 130, 170), (215, 170, 170), (235, 195, 170)),
    ("snow", "night"): ((46, 54, 84), (56, 64, 94), (74, 82, 110)),
    ("storm", "dawn"): ((80, 82, 105), (105, 100, 120), (120, 112, 128)),
    ("storm", "day"): ((100, 104, 124), (112, 116, 135), (124, 128, 146)),
    ("storm", "sunset"): ((70, 62, 92), (110, 85, 100), (130, 100, 100)),
    ("storm", "night"): ((22, 24, 40), (26, 28, 44), (40, 42, 60)),
}
CLOUD_COLORS: dict[str, tuple[Color, Color]] = {
    "dawn": ((250, 228, 236), (222, 196, 214)),
    "day": ((244, 246, 250), (214, 220, 230)),
    "sunset": ((255, 206, 180), (226, 156, 150)),
    "night": ((104, 110, 132), (84, 90, 112)),
    "dark_dawn": ((112, 110, 132), (94, 92, 114)),
    "dark_day": ((120, 128, 144), (100, 106, 122)),
    "dark_sunset": ((112, 94, 112), (92, 76, 94)),
    "dark_night": ((70, 74, 94), (56, 60, 78)),
}
SUN = (255, 214, 90)
SUN_RAY = (255, 236, 160)
MOON = (250, 240, 190)
STAR = (255, 250, 220)
RAIN = {
    "dawn": (220, 226, 245), "day": (226, 238, 252),
    "sunset": (240, 214, 214), "night": (150, 172, 212),
}
DAWN_SUN = (255, 200, 120)
SUNSET_SUN = (255, 150, 80)
SNOW = (255, 255, 255)
BOLT = (255, 230, 90)


def puff(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, colors: tuple[Color, Color]) -> None:
    """A stepped pixel cloud whose bottom-left corner is (x, y)."""
    light, shade = colors
    draw.rectangle((x + 2, y - 4, x + width - 4, y - 3), fill=light)
    draw.rectangle((x + 1, y - 3, x + width - 2, y - 1), fill=light)
    draw.rectangle((x, y - 1, x + width - 1, y), fill=light)
    draw.rectangle((x + 1, y, x + width - 2, y), fill=shade)


def sky(draw: ImageDraw.ImageDraw, kind: str, time: str) -> None:
    top, middle, bottom = SKIES[(kind, time)]
    x0, y0, x1, y1 = GLASS
    draw.rectangle((x0, y0, x1, y1), fill=bottom)
    draw.rectangle((x0, y0, x1, y0 + 15), fill=middle)
    draw.rectangle((x0, y0, x1, y0 + 6), fill=top)


def low_sun(draw: ImageDraw.ImageDraw, cx: int, color: Color) -> None:
    """A sun sitting on the bottom edge of the window, half below the horizon."""
    draw.ellipse((cx - 5, 31, cx + 5, 41), fill=color)


def stars(draw: ImageDraw.ImageDraw, points: tuple[tuple[int, int], ...]) -> None:
    for x, y in points:
        draw.point((x, y), fill=STAR)


def draw_clear(draw: ImageDraw.ImageDraw, time: str, frame: int) -> None:
    sky(draw, "clear", time)
    if time == "day":
        draw.rectangle((103, 14, 108, 19), fill=SUN)
        draw.rectangle((104, 13, 107, 20), fill=SUN)
        draw.rectangle((102, 15, 109, 18), fill=SUN)
        for x, y in ((100, 16), (111, 16), (105, 11), (105, 22), (101, 13), (110, 13), (101, 21), (110, 21)):
            draw.point((x, y), fill=SUN_RAY)
        puff(draw, 83, 34, 9, CLOUD_COLORS["day"])
    elif time == "dawn":
        stars(draw, ((104, 14), (109, 17), (100, 13)))
        low_sun(draw, 88, DAWN_SUN)
        puff(draw, 99, 31, 10, CLOUD_COLORS["dawn"])
    elif time == "sunset":
        low_sun(draw, 104, SUNSET_SUN)
        puff(draw, 82, 22, 11, CLOUD_COLORS["sunset"])
        puff(draw, 99, 18, 9, CLOUD_COLORS["sunset"])
    else:
        draw.rectangle((103, 14, 108, 19), fill=MOON)
        draw.rectangle((104, 13, 107, 20), fill=MOON)
        draw.rectangle((105, 13, 109, 18), fill=SKIES[("clear", "night")][0])
        stars(draw, ((84, 14), (90, 18), (86, 30), (92, 35), (100, 31), (108, 34), (99, 21), (110, 28)))


def draw_cloudy(draw: ImageDraw.ImageDraw, time: str, frame: int) -> None:
    sky(draw, "cloudy", time)
    colors = CLOUD_COLORS[time]
    puff(draw, 82, 19, 11, colors)
    puff(draw, 99, 21, 12, colors)
    puff(draw, 86, 34, 13, colors)
    puff(draw, 101, 36, 10, colors)


def falling(
    draw: ImageDraw.ImageDraw, frame: int, color: Color, length: int, seed: int, count: int
) -> None:
    rng = random.Random(seed)
    x0, y0, x1, y1 = GLASS
    height = y1 - y0 + 1
    for _ in range(count):
        x = rng.randint(x0, x1)
        y = rng.randint(0, height - 1)
        y = y0 + (y + frame * 3) % height
        for i in range(length):
            if y + i <= y1:
                draw.point((x - (i // 2 if length > 1 else 0), y + i), fill=color)


def draw_rain(draw: ImageDraw.ImageDraw, time: str, frame: int) -> None:
    sky(draw, "rain", time)
    colors = CLOUD_COLORS[f"dark_{time}"]
    puff(draw, 80, 16, 16, colors)
    puff(draw, 96, 17, 16, colors)
    falling(draw, frame, RAIN[time], 3, seed=7, count=24)


def draw_snow(draw: ImageDraw.ImageDraw, time: str, frame: int) -> None:
    sky(draw, "snow", time)
    falling(draw, frame, SNOW, 1, seed=11, count=22)
    rng = random.Random(23)
    for _ in range(4):
        x, y = rng.randint(83, 109), rng.randint(14, 36)
        y = 12 + (y - 12 + frame * 2) % 27
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            draw.point((x + dx, min(y + dy, 38)), fill=SNOW)


def draw_storm(draw: ImageDraw.ImageDraw, time: str, frame: int) -> None:
    sky(draw, "storm", time)
    colors = CLOUD_COLORS[f"dark_{time}"]
    puff(draw, 80, 17, 16, colors)
    puff(draw, 96, 16, 16, colors)
    falling(draw, frame, RAIN[time], 3, seed=5, count=26)
    if frame == 0:
        bolt = [(104, 18), (103, 19), (102, 20), (102, 21), (103, 21), (104, 21), (103, 22), (102, 23), (101, 24)]
        for x, y in bolt:
            draw.point((x, y), fill=BOLT)
        for x, y in [(100, 28), (101, 29), (100, 30)]:
            draw.point((x, y), fill=BOLT)


SCENES = {
    "clear": (draw_clear, 1),
    "cloudy": (draw_cloudy, 1),
    "rain": (draw_rain, 2),
    "snow": (draw_snow, 2),
    "storm": (draw_storm, 2),
}


def render(kind: str, time: str, frame: int) -> Image.Image:
    scene = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    painter, _ = SCENES[kind]
    painter(ImageDraw.Draw(scene), time, frame)
    # Keep only the four panes so the window frame and mullions stay visible.
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    for x0, y0, x1, y1 in PANES:
        box = (x0, y0, x1 + 1, y1 + 1)
        layer.paste(scene.crop(box), box)
    return layer


def main() -> None:
    for kind, (_, frames) in SCENES.items():
        for time in TIMES:
            for frame in range(frames):
                suffix = "" if frame == 0 else "-2"
                save(render(kind, time, frame), OUTPUT_DIR / f"{kind}-{time}{suffix}.png")


if __name__ == "__main__":
    main()
