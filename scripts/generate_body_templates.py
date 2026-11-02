"""Generate and validate MOZI's fixed pixel body templates.

The silhouettes are deterministic 40x40 masks enlarged to 160x160 with
nearest-neighbor sampling. No random point movement or outline noise is used.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

LOGICAL_SIZE = 40
SCALE = 4
INK = (6, 6, 20, 255)
FILL = (255, 255, 255, 255)
OUTPUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "frontend/public/assets/character-prototype/bodies"
)


# A hand-authored, immutable front silhouette. Each row contains one or more
# inclusive x-ranges. This is the only body shape used by the renderer.
BASIC_ROW_SPANS: dict[int, tuple[tuple[int, int], ...]] = {
    8: ((19, 19),),
    9: ((16, 23),),
    10: ((13, 26),),
    11: ((11, 28),),
    12: ((9, 30),),
    13: ((7, 32),),
    14: ((6, 33),),
    15: ((5, 34),),
    16: ((4, 35),),
    17: ((3, 36),),
    18: ((3, 36),),
    19: ((2, 37),),
    20: ((2, 37),),
    21: ((2, 37),),
    22: ((2, 37),),
    23: ((2, 37),),
    24: ((2, 37),),
    25: ((2, 37),),
    26: ((2, 37),),
    27: ((3, 36),),
    28: ((4, 35),),
    29: ((5, 34),),
    30: ((6, 33),),
    31: ((6, 12), (16, 23), (27, 33)),
    32: ((7, 11), (17, 22), (28, 32)),
}

TEMPLATES = {"basic": BASIC_ROW_SPANS}
LEGACY_ALIASES = {
    "soft": "basic",
    "wide": "basic",
    "plump": "basic",
    "low": "basic",
    "tall": "basic",
}


def create_fill_mask(
    row_spans: dict[int, tuple[tuple[int, int], ...]],
) -> Image.Image:
    mask = Image.new("L", (LOGICAL_SIZE, LOGICAL_SIZE), 0)
    pixels = mask.load()
    for y, spans in row_spans.items():
        for left, right in spans:
            for x in range(left, right + 1):
                pixels[x, y] = 255
    return mask


def connected_components(mask: Image.Image) -> int:
    pixels = mask.load()
    remaining = {
        (x, y)
        for y in range(mask.height)
        for x in range(mask.width)
        if pixels[x, y] > 0
    }
    components = 0
    while remaining:
        components += 1
        queue = deque([remaining.pop()])
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    queue.append(neighbor)
    return components


def hole_count(mask: Image.Image) -> int:
    pixels = mask.load()
    outside: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for x in range(mask.width):
        queue.extend(((x, 0), (x, mask.height - 1)))
    for y in range(mask.height):
        queue.extend(((0, y), (mask.width - 1, y)))
    while queue:
        point = queue.popleft()
        x, y = point
        if point in outside or not (0 <= x < mask.width and 0 <= y < mask.height):
            continue
        if pixels[x, y] > 0:
            continue
        outside.add(point)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    transparent = sum(1 for value in mask.get_flattened_data() if value == 0)
    return transparent - len(outside)


def has_convex_crown(mask: Image.Image) -> bool:
    pixels = mask.load()
    profile = []
    for x in range(mask.width):
        rows = [y for y in range(mask.height) if pixels[x, y] > 0]
        if rows:
            profile.append(min(rows))
    minimum = min(profile)
    first_peak = profile.index(minimum)
    last_peak = len(profile) - 1 - profile[::-1].index(minimum)
    left_is_rising = all(
        profile[index] >= profile[index + 1]
        for index in range(first_peak)
    )
    right_is_falling = all(
        profile[index] <= profile[index + 1]
        for index in range(last_peak, len(profile) - 1)
    )
    return left_is_rising and right_is_falling


def crown_plateau_width(mask: Image.Image) -> int:
    pixels = mask.load()
    top = min(
        y
        for y in range(mask.height)
        for x in range(mask.width)
        if pixels[x, y] > 0
    )
    return sum(pixels[x, top] > 0 for x in range(mask.width))


def has_rounded_sides(mask: Image.Image) -> bool:
    pixels = mask.load()
    widths = []
    for y in range(mask.height):
        columns = [x for x in range(mask.width) if pixels[x, y] > 0]
        if columns:
            widths.append(len(columns))
    maximum = max(widths)
    widest_row = widths.index(maximum)
    return (
        widths[0] <= 3
        and widths[-1] < maximum * 0.65
        and all(widths[index] <= widths[index + 1] for index in range(widest_row))
    )


def has_bottom_wave(mask: Image.Image) -> bool:
    pixels = mask.load()
    bottoms = []
    for x in range(mask.width):
        rows = [y for y in range(mask.height) if pixels[x, y] > 0]
        if rows:
            bottoms.append(max(rows))
    baseline = max(bottoms)
    shallow_points = sum(value < baseline for value in bottoms[len(bottoms) // 5:-len(bottoms) // 5])
    return shallow_points >= 4


def validate_mask(name: str, mask: Image.Image) -> None:
    assert connected_components(mask) == 1, f"{name}: body must be connected"
    assert hole_count(mask) == 0, f"{name}: body cannot contain holes"
    assert has_convex_crown(mask), f"{name}: crown contains a concave notch"
    assert crown_plateau_width(mask) <= 2, f"{name}: crown plateau is too long"
    assert has_rounded_sides(mask), f"{name}: side silhouette is too vertical"
    assert has_bottom_wave(mask), f"{name}: bottom wave is missing"


def render_template(mask: Image.Image) -> Image.Image:
    outline = mask.filter(ImageFilter.MaxFilter(3))
    image = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    image.paste(INK, mask=outline)
    image.paste(FILL, mask=mask)
    return image.resize(
        (LOGICAL_SIZE * SCALE, LOGICAL_SIZE * SCALE),
        Image.Resampling.NEAREST,
    )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rendered: dict[str, Image.Image] = {}
    for name, spec in TEMPLATES.items():
        mask = create_fill_mask(spec)
        validate_mask(name, mask)
        rendered[name] = render_template(mask)
        rendered[name].save(OUTPUT_DIR / f"{name}.png", optimize=True)
        print(f"validated {name}: connected=1 holes=0 crown=convex wave=present")
    for alias, target in LEGACY_ALIASES.items():
        rendered[target].save(OUTPUT_DIR / f"{alias}.png", optimize=True)
        print(f"legacy alias {alias} -> {target}")


if __name__ == "__main__":
    main()
