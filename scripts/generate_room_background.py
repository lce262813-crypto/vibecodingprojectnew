"""Generate MOZI's front-facing pixel emotion room and furniture layers.

The empty room (wall, floor and window) is drawn on a fixed 192x108 logical
pixel canvas (16:9) and enlarged with nearest-neighbor sampling, so every
logical pixel stays a crisp square. Each furniture item is a transparent layer
on the same canvas, so a bought item lines up when stacked over the room.
A cropped icon of every item is also saved for the shop.
"""

from __future__ import annotations

from functools import partial
from pathlib import Path

from PIL import Image, ImageDraw

WIDTH = 192
HEIGHT = 108
SCALE = 5
FLOOR_Y = 66
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "frontend/public/assets/room"
TRANSPARENT = (0, 0, 0, 0)

INK = (59, 47, 69)
WALL = (244, 234, 222)
WALL_STRIPE = (236, 222, 208)
WALL_DOT = (226, 210, 228)
BASEBOARD = (184, 143, 114)
BASEBOARD_DARK = (150, 112, 88)
PLANK = (214, 176, 138)
PLANK_ALT = (204, 162, 124)
PLANK_LINE = (169, 127, 95)
WOOD = (168, 119, 90)
WOOD_LIGHT = (196, 148, 112)
WOOD_DARK = (128, 88, 66)
SKY = (191, 230, 238)
SKY_LIGHT = (220, 242, 246)
CLOUD = (255, 255, 255)
WHITE = (255, 255, 255)
CURTAIN = (242, 184, 198)
CURTAIN_DARK = (222, 152, 172)
BLANKET = (201, 184, 234)
BLANKET_DARK = (171, 152, 214)
LINEN = (255, 252, 246)
LINEN_SHADE = (232, 224, 218)
RUG = (233, 201, 216)
RUG_BORDER = (213, 169, 192)
POT = (214, 132, 98)
POT_DARK = (182, 104, 76)
LEAF = (132, 186, 128)
LEAF_DARK = (96, 150, 98)
HEART = (240, 120, 150)
STAR_YELLOW = (250, 200, 70)
BLIND = (250, 242, 226)
BLIND_DARK = (230, 216, 196)
POSTER = (252, 246, 236)
MIRROR = (206, 232, 242)
TV_BODY = (196, 196, 212)
TV_SCREEN = (150, 214, 204)
CACTUS = (120, 190, 130)
SUNFLOWER = (250, 206, 80)
SUNFLOWER_CENTER = (150, 100, 70)
CHECK_A = (206, 228, 246)
CHECK_B = (246, 250, 255)
CHECK_BORDER = (150, 190, 222)
CUSHION = (250, 196, 120)
CUSHION_DARK = (226, 160, 90)
TOYBOX = (236, 150, 130)
TOYBOX_DARK = (206, 116, 100)
LAMP_SHADE = (250, 222, 160)
LAMP_GLOW = (255, 244, 200)
MUSHROOM = (232, 104, 104)
BOOKS = [
    (240, 160, 160), (160, 196, 240), (250, 214, 140),
    (170, 220, 180), (200, 170, 230), (245, 180, 120),
]

Box = tuple[int, int, int, int]
Color = tuple[int, int, int]


def fill(draw: ImageDraw.ImageDraw, box: Box, color: Color) -> None:
    draw.rectangle(box, fill=color)


def block(
    draw: ImageDraw.ImageDraw,
    box: Box,
    color: Color,
    rounded: bool = False,
    behind: tuple[int, ...] = TRANSPARENT,
) -> None:
    """Draw a filled block with a 1px ink outline and optional cut corners."""
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=INK)
    draw.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=color)
    if rounded:
        for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            draw.point((x, y), fill=behind)
        for x, y in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)):
            draw.point((x, y), fill=INK)


def draw_bitmap(
    draw: ImageDraw.ImageDraw, x0: int, y0: int, rows: list[str], palette: dict[str, Color]
) -> None:
    for dy, row in enumerate(rows):
        for dx, key in enumerate(row):
            if key in palette:
                draw.point((x0 + dx, y0 + dy), fill=palette[key])


# ---------------------------------------------------------------- empty room

def draw_wall(draw: ImageDraw.ImageDraw) -> None:
    fill(draw, (0, 0, WIDTH - 1, FLOOR_Y - 1), WALL)
    for x in range(0, WIDTH, 12):
        fill(draw, (x, 0, x + 5, FLOOR_Y - 5), WALL_STRIPE)
    for y in range(6, FLOOR_Y - 6, 10):
        for x in range(9, WIDTH, 12):
            draw.point((x, y), fill=WALL_DOT)
    fill(draw, (0, FLOOR_Y - 5, WIDTH - 1, FLOOR_Y - 1), BASEBOARD)
    fill(draw, (0, FLOOR_Y - 5, WIDTH - 1, FLOOR_Y - 5), INK)
    fill(draw, (0, FLOOR_Y - 1, WIDTH - 1, FLOOR_Y - 1), BASEBOARD_DARK)


def draw_floor(draw: ImageDraw.ImageDraw) -> None:
    for row, y in enumerate(range(FLOOR_Y, HEIGHT, 7)):
        color = PLANK if row % 2 == 0 else PLANK_ALT
        fill(draw, (0, y, WIDTH - 1, min(y + 6, HEIGHT - 1)), color)
        fill(draw, (0, y, WIDTH - 1, y), PLANK_LINE)
        offset = 0 if row % 2 == 0 else 24
        for x in range(offset, WIDTH, 48):
            fill(draw, (x, y, x, min(y + 6, HEIGHT - 1)), PLANK_LINE)


def draw_window(draw: ImageDraw.ImageDraw) -> None:
    """Frame and a default clear sky; weather layers repaint the four panes."""
    block(draw, (78, 9, 114, 41), WOOD_LIGHT)
    fill(draw, (81, 12, 111, 38), SKY)
    fill(draw, (81, 12, 111, 17), SKY_LIGHT)
    for x, y, w in ((85, 20, 8), (87, 19, 4), (101, 28, 7), (102, 27, 4)):
        fill(draw, (x, y, x + w - 1, y), CLOUD)
    fill(draw, (95, 12, 97, 38), WOOD_LIGHT)
    fill(draw, (81, 24, 111, 26), WOOD_LIGHT)
    block(draw, (75, 40, 117, 43), WOOD)


# ---------------------------------------------------------------- wall decor

HEART_BITMAP = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"]
STAR_BITMAP = [
    "000010000", "000111000", "111111111", "011111110",
    "001111100", "011101110", "110000011",
]


def draw_picture(
    draw: ImageDraw.ImageDraw, motif: list[str] = HEART_BITMAP, color: Color = HEART
) -> None:
    block(draw, (22, 12, 40, 28), WOOD)
    fill(draw, (24, 14, 38, 26), LINEN)
    x0 = 31 - len(motif[0]) // 2
    y0 = 20 - len(motif) // 2
    for dy, row in enumerate(motif):
        for dx, bit in enumerate(row):
            if bit == "1":
                draw.point((x0 + dx, y0 + dy), fill=color)


def draw_poster(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (20, 9, 42, 31), POSTER)
    fill(draw, (21, 10, 41, 11), CURTAIN)
    jelly = [
        "...kkkkk...",
        "..kfffffk..",
        ".kfffffffk.",
        "kffkfffkffk",
        "kfffffffffk",
        "kffffkffffk",
        "kfffffffffk",
        "kfkfkfkfkfk",
        ".k.k.k.k.k.",
    ]
    draw_bitmap(draw, 26, 14, jelly, {"k": INK, "f": BLANKET})
    for i, color in enumerate((HEART, STAR_YELLOW, SKY)):
        fill(draw, (26 + i * 4, 26, 27 + i * 4, 27), color)


def draw_clock(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((129, 4, 145, 20), fill=WOOD, outline=INK)
    draw.ellipse((131, 6, 143, 18), fill=LINEN)
    for x, y in ((137, 7), (142, 12), (137, 17), (132, 12)):
        draw.point((x, y), fill=WOOD_DARK)
    fill(draw, (137, 8, 137, 12), INK)
    fill(draw, (137, 12, 140, 12), INK)
    draw.point((137, 12), fill=HEART)


def draw_mirror(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((130, 3, 144, 25), fill=WOOD_LIGHT, outline=INK)
    draw.ellipse((132, 5, 142, 23), fill=MIRROR)
    for i in range(4):
        draw.point((134 + i, 9 + i), fill=WHITE)
        draw.point((134 + i, 12 + i), fill=WHITE)


# ---------------------------------------------------------------- window decor

def draw_curtains(
    draw: ImageDraw.ImageDraw, color: Color = CURTAIN, dark: Color = CURTAIN_DARK
) -> None:
    for x0 in (70, 113):
        block(draw, (x0, 7, x0 + 8, 46), color)
        for x in range(x0 + 2, x0 + 8, 3):
            fill(draw, (x, 9, x, 44), dark)
    block(draw, (68, 5, 124, 9), dark)


def draw_blinds(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (76, 7, 116, 10), WOOD)
    block(draw, (79, 10, 113, 26), BLIND)
    for y in range(13, 25, 3):
        fill(draw, (80, y, 112, y), BLIND_DARK)
    block(draw, (78, 25, 114, 27), WOOD)
    fill(draw, (96, 28, 96, 32), INK)
    block(draw, (95, 32, 97, 34), WOOD_DARK)


# ---------------------------------------------------------------- lighting

def draw_floor_lamp(draw: ImageDraw.ImageDraw) -> None:
    fill(draw, (62, 40, 63, 68), INK)
    block(draw, (58, 67, 67, 71), WOOD_DARK)
    fill(draw, (58, 29, 67, 29), INK)
    for i, half in enumerate((3, 3, 4, 4, 5, 5, 6, 6, 6)):
        fill(draw, (62 - half, 30 + i, 63 + half, 30 + i), LAMP_SHADE)
        draw.point((62 - half - 1, 30 + i), fill=INK)
        draw.point((63 + half + 1, 30 + i), fill=INK)
    fill(draw, (55, 39, 70, 39), INK)
    fill(draw, (57, 38, 68, 38), LAMP_GLOW)


def draw_mushroom_lamp(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (59, 56, 66, 71), LINEN)
    draw.pieslice((54, 45, 71, 66), 180, 360, fill=MUSHROOM, outline=INK)
    fill(draw, (55, 55, 70, 55), INK)
    for x, y in ((59, 49), (65, 50), (62, 52), (57, 53), (67, 53)):
        fill(draw, (x, y, x + 1, y), WHITE)
    fill(draw, (60, 57, 65, 57), LAMP_GLOW)


# ---------------------------------------------------------------- furniture

def draw_bed(
    draw: ImageDraw.ImageDraw, blanket: Color = BLANKET, blanket_dark: Color = BLANKET_DARK
) -> None:
    block(draw, (8, 36, 54, 60), WOOD, rounded=True)
    fill(draw, (10, 38, 52, 40), WOOD_LIGHT)
    block(draw, (13, 44, 29, 53), LINEN, rounded=True, behind=WOOD)
    fill(draw, (14, 51, 28, 52), LINEN_SHADE)
    block(draw, (6, 52, 56, 68), blanket)
    fill(draw, (7, 53, 55, 55), LINEN)
    fill(draw, (7, 56, 55, 56), LINEN_SHADE)
    for x in range(12, 54, 8):
        fill(draw, (x, 59, x + 3, 62), blanket_dark)
    fill(draw, (7, 67, 55, 67), blanket_dark)
    block(draw, (8, 68, 11, 72), WOOD_DARK)
    block(draw, (51, 68, 54, 72), WOOD_DARK)


def draw_bookshelf(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (148, 20, 182, 70), WOOD)
    shelf_tops = (23, 39, 55)
    for top in shelf_tops:
        fill(draw, (151, top, 179, top + 12), WOOD_DARK)
        fill(draw, (150, top + 13, 180, top + 14), WOOD_LIGHT)
    book_index = 0
    for top in shelf_tops:
        x = 152
        heights = (11, 9, 12, 10, 8, 11, 12, 9)
        for slot, height in enumerate(heights):
            width = 3 if slot % 3 else 2
            if x + width > 179:
                break
            if slot == 5 and top == 39:
                x += 4
                continue
            color = BOOKS[book_index % len(BOOKS)]
            block(draw, (x, top + 13 - height, x + width, top + 12), color)
            x += width + 1
            book_index += 1
    # small jar on the middle shelf gap
    block(draw, (171, 45, 176, 51), SKY)


def draw_wardrobe(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (148, 18, 182, 68), WOOD)
    block(draw, (151, 21, 164, 61), WOOD_LIGHT)
    block(draw, (166, 21, 179, 61), WOOD_LIGHT)
    fill(draw, (162, 39, 162, 42), INK)
    fill(draw, (168, 39, 168, 42), INK)
    block(draw, (151, 62, 179, 66), WOOD_DARK)
    fill(draw, (163, 64, 167, 64), WOOD_LIGHT)
    block(draw, (150, 68, 153, 71), WOOD_DARK)
    block(draw, (177, 68, 180, 71), WOOD_DARK)


def draw_tv(draw: ImageDraw.ImageDraw) -> None:
    draw.line((160, 26, 154, 17), fill=INK)
    draw.line((170, 26, 176, 17), fill=INK)
    block(draw, (148, 25, 182, 50), TV_BODY)
    block(draw, (151, 28, 174, 47), TV_SCREEN)
    jelly = ["..kkk..", ".kfffk.", "kfkfkfk", "kfffffk", "kkkkkkk"]
    draw_bitmap(draw, 159, 34, jelly, {"k": INK, "f": BLANKET})
    for y in (31, 36, 41):
        block(draw, (176, y, 179, y + 3), WOOD_DARK)
    block(draw, (146, 50, 184, 70), WOOD)
    block(draw, (149, 53, 164, 67), WOOD_LIGHT)
    block(draw, (166, 53, 181, 67), WOOD_LIGHT)


# ---------------------------------------------------------------- plants

def draw_pot(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (130, 54, 145, 68), POT)
    fill(draw, (131, 55, 144, 57), POT_DARK)


def draw_plant(draw: ImageDraw.ImageDraw) -> None:
    leaves = [
        (132, 40, 137, 47), (138, 36, 143, 45), (128, 46, 134, 52),
        (140, 46, 146, 52), (135, 44, 141, 54),
    ]
    for box in leaves:
        block(draw, box, LEAF, rounded=True)
    fill(draw, (138, 39, 139, 52), LEAF_DARK)
    draw_pot(draw)


def draw_cactus(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (134, 36, 141, 55), CACTUS, rounded=True)
    block(draw, (128, 43, 133, 50), CACTUS, rounded=True)
    block(draw, (142, 40, 147, 47), CACTUS, rounded=True)
    fill(draw, (133, 47, 134, 48), CACTUS)
    fill(draw, (141, 44, 142, 45), CACTUS)
    for x, y in ((136, 40), (139, 44), (136, 48), (139, 52), (130, 46), (144, 43)):
        draw.point((x, y), fill=LEAF_DARK)
    fill(draw, (136, 34, 139, 35), HEART)
    draw_pot(draw)


def draw_sunflower(draw: ImageDraw.ImageDraw) -> None:
    fill(draw, (137, 42, 138, 55), LEAF_DARK)
    block(draw, (130, 46, 136, 51), LEAF, rounded=True)
    block(draw, (139, 48, 145, 53), LEAF, rounded=True)
    draw.ellipse((129, 28, 146, 45), fill=SUNFLOWER, outline=INK)
    draw.ellipse((134, 33, 141, 40), fill=SUNFLOWER_CENTER, outline=INK)
    draw_pot(draw)


# ---------------------------------------------------------------- floor

def draw_rug(
    draw: ImageDraw.ImageDraw,
    row_colors: tuple[Color, ...] = (RUG,) * 6,
    border: Color = RUG_BORDER,
    dots: bool = True,
) -> None:
    cx, cy = 96, 88
    rows = [(-2, 28), (-1, 38), (0, 42), (1, 42), (2, 38), (3, 28)]
    scale = 3
    for (step, half), color in zip(rows, row_colors):
        y0 = cy + step * scale
        fill(draw, (cx - half, y0, cx + half, y0 + scale - 1), color)
    # stepped outline
    for step, half in rows:
        y0 = cy + step * scale
        fill(draw, (cx - half - 1, y0, cx - half - 1, y0 + scale - 1), border)
        fill(draw, (cx + half + 1, y0, cx + half + 1, y0 + scale - 1), border)
    fill(draw, (cx - 28, cy - 2 * scale - 1, cx + 28, cy - 2 * scale - 1), border)
    fill(draw, (cx - 28, cy + 4 * scale, cx + 28, cy + 4 * scale), border)
    if dots:
        for x in range(cx - 30, cx + 31, 6):
            fill(draw, (x, cy + 1, x + 2, cy + 3), border)


def draw_check_rug(draw: ImageDraw.ImageDraw) -> None:
    fill(draw, (67, 81, 125, 99), CHECK_BORDER)
    for y in range(82, 99, 4):
        for x in range(68, 125, 4):
            color = CHECK_A if ((x - 68) // 4 + (y - 82) // 4) % 2 == 0 else CHECK_B
            fill(draw, (x, y, min(x + 3, 124), min(y + 3, 98)), color)


def draw_cushion(draw: ImageDraw.ImageDraw) -> None:
    block(draw, (14, 87, 40, 101), CUSHION, rounded=True)
    fill(draw, (16, 98, 38, 99), CUSHION_DARK)
    for x in (20, 27, 34):
        block(draw, (x - 1, 92, x + 1, 94), CUSHION_DARK)


def draw_toybox(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((29, 72, 39, 82), fill=SKY, outline=INK)
    fill(draw, (31, 76, 37, 77), WHITE)
    block(draw, (13, 79, 41, 101), TOYBOX)
    block(draw, (12, 79, 42, 84), TOYBOX_DARK)
    for x, y in ((19, 90), (27, 94), (35, 89)):
        draw_bitmap(draw, x - 1, y - 1, [".s.", "sss", ".s."], {"s": SUNFLOWER})


# Order matters: this is the stacking order when layers are drawn together.
# Keep ids in sync with FURNITURE_CATALOG in backend/app/constants/shop.py.
FURNITURE = {
    "picture": draw_picture,
    "picture_star": partial(draw_picture, motif=STAR_BITMAP, color=STAR_YELLOW),
    "poster": draw_poster,
    "clock": draw_clock,
    "mirror": draw_mirror,
    "curtains": draw_curtains,
    "curtains_sky": partial(draw_curtains, color=(178, 214, 240), dark=(140, 186, 222)),
    "blinds": draw_blinds,
    "lamp": draw_floor_lamp,
    "lamp_mushroom": draw_mushroom_lamp,
    "bed": draw_bed,
    "bed_yellow": partial(draw_bed, blanket=(250, 222, 140), blanket_dark=(232, 190, 96)),
    "bed_mint": partial(draw_bed, blanket=(176, 226, 206), blanket_dark=(130, 196, 172)),
    "bookshelf": draw_bookshelf,
    "wardrobe": draw_wardrobe,
    "tv": draw_tv,
    "plant": draw_plant,
    "cactus": draw_cactus,
    "sunflower": draw_sunflower,
    "rug": draw_rug,
    "rug_check": draw_check_rug,
    "rug_rainbow": partial(
        draw_rug,
        row_colors=(
            (246, 178, 178), (250, 210, 160), (250, 236, 160),
            (186, 228, 186), (176, 206, 240), (206, 186, 236),
        ),
        border=(190, 160, 200),
        dots=False,
    ),
    "cushion": draw_cushion,
    "toybox": draw_toybox,
}


def render_room() -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), WALL)
    draw = ImageDraw.Draw(image)
    draw_wall(draw)
    draw_floor(draw)
    draw_window(draw)
    return image


def render_layer(painter) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), TRANSPARENT)
    painter(ImageDraw.Draw(image))
    return image


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((image.width * SCALE, image.height * SCALE), Image.Resampling.NEAREST).save(
        path, optimize=True
    )
    print(f"saved {path}")


def save_icon(layer: Image.Image, path: Path) -> None:
    """Crop a furniture layer to its own pixels for the shop thumbnail."""
    left, top, right, bottom = layer.getbbox()
    save(layer.crop((max(left - 1, 0), max(top - 1, 0), right + 1, bottom + 1)), path)


def main() -> None:
    save(render_room(), OUTPUT_DIR / "pixel-room.png")
    for item_id, painter in FURNITURE.items():
        layer = render_layer(painter)
        save(layer, OUTPUT_DIR / "furniture" / f"{item_id}.png")
        save_icon(layer, OUTPUT_DIR / "furniture" / "icons" / f"{item_id}.png")


if __name__ == "__main__":
    main()
