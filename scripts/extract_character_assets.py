"""Losslessly crop MOZI character assets from the supplied catalog image.

The script never repaints or resamples source pixels. It only crops, makes the
connected card background transparent, and adds transparent padding.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


CROPS = {
    "dugeuni": (28, 365, 190, 516),
    "nokchomong": (412, 365, 566, 516),
    "beoreogi": (790, 360, 944, 516),
    "geokjeongi": (1166, 366, 1326, 518),
    "ulmeogi": (30, 556, 190, 738),
    "pyeongoni": (415, 552, 569, 739),
    "seollemi": (792, 566, 939, 741),
    "yageunmon": (1167, 580, 1326, 741),
    "honrani": (27, 782, 184, 956),
    "seungbuyogi": (414, 788, 601, 964),
    "apeuri": (790, 794, 934, 958),
    "ppudeuswang": (1164, 784, 1317, 958),
}


def remove_right_side_strays(image: Image.Image, cutoff: int) -> Image.Image:
    """Remove detached text fragments while retaining large character accessories."""
    alpha = image.getchannel("A")
    width, height = image.size
    seen: set[tuple[int, int]] = set()
    pixels = alpha.load()
    rgba_pixels = image.load()

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
                for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    nx, ny = neighbor
                    if 0 <= nx < width and 0 <= ny < height:
                        queue.append(neighbor)
            left = min(x for x, _ in component)
            if left >= cutoff:
                for x, y in component:
                    red, green, blue, _ = rgba_pixels[x, y]
                    rgba_pixels[x, y] = (red, green, blue, 0)
    return image


def color_distance(first: tuple[int, int, int], second: tuple[int, int, int]) -> int:
    return sum((a - b) ** 2 for a, b in zip(first, second, strict=True))


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    corner_colors = [
        pixels[0, 0][:3],
        pixels[width - 1, 0][:3],
        pixels[0, height - 1][:3],
        pixels[width - 1, height - 1][:3],
    ]
    background = tuple(
        sorted(color[channel] for color in corner_colors)[len(corner_colors) // 2]
        for channel in range(3)
    )

    def is_background(x: int, y: int) -> bool:
        rgb = pixels[x, y][:3]
        return color_distance(rgb, background) <= 30**2 and max(rgb) - min(rgb) <= 24

    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not is_background(x, y):
            continue
        visited.add((x, y))
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    return rgba


def extract(source: Path, output_dir: Path) -> None:
    original = Image.open(source).convert("RGB")
    if original.size != (1536, 1024):
        raise ValueError(f"Expected a 1536x1024 source image, got {original.size}")
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, bounds in CROPS.items():
        crop = original.crop(bounds)
        transparent = remove_connected_background(crop)
        stray_cutoffs = {
            "seungbuyogi": 150,
            "apeuri": 140,
            "ppudeuswang": 145,
        }
        if name in stray_cutoffs:
            transparent = remove_right_side_strays(
                transparent, cutoff=stray_cutoffs[name]
            )
        alpha_bounds = transparent.getchannel("A").getbbox()
        if alpha_bounds is None:
            raise ValueError(f"No character pixels found for {name}")
        trimmed = transparent.crop(alpha_bounds)
        padded = Image.new("RGBA", (trimmed.width + 8, trimmed.height + 8), (0, 0, 0, 0))
        padded.paste(trimmed, (4, 4), trimmed)
        destination = output_dir / f"{name}.png"
        padded.save(destination, format="PNG", compress_level=9)
        print(f"{name}: {padded.width}x{padded.height} -> {destination}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    extract(args.source, args.output_dir)


if __name__ == "__main__":
    main()
