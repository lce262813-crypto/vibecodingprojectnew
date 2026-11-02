import json
import sys
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.generate_body_templates import (  # noqa: E402
    LOGICAL_SIZE,
    TEMPLATES,
    connected_components,
    crown_plateau_width,
    has_bottom_wave,
    has_convex_crown,
    has_rounded_sides,
    hole_count,
)

BODIES = PROJECT_ROOT / "frontend/public/assets/character-prototype/bodies"


def logical_alpha(template_id: str) -> Image.Image:
    image = Image.open(BODIES / f"{template_id}.png").convert("RGBA")
    assert image.size == (160, 160)
    return image.getchannel("A").resize(
        (LOGICAL_SIZE, LOGICAL_SIZE), Image.Resampling.NEAREST
    )


def test_shared_exported_body_mask_is_structurally_safe() -> None:
    assert set(TEMPLATES) == {"basic"}
    for template_id in TEMPLATES:
        mask = logical_alpha(template_id)
        assert connected_components(mask) == 1, template_id
        assert hole_count(mask) == 0, template_id
        assert has_convex_crown(mask), template_id
        # The one-pixel fill crown expands by one pixel per side for the outline.
        assert crown_plateau_width(mask) <= 3, template_id
        assert has_rounded_sides(mask), template_id
        assert has_bottom_wave(mask), template_id


def test_face_safe_boxes_stay_inside_each_body() -> None:
    metadata = json.loads((BODIES / "templates.json").read_text(encoding="utf-8"))
    assert {item["id"] for item in metadata} == set(TEMPLATES)
    for item in metadata:
        mask = logical_alpha(item["id"])
        left, top, right, bottom = item["face_safe_box"]
        assert all(
            mask.getpixel((x, y)) > 0
            for y in range(top, bottom + 1)
            for x in range(left, right + 1)
        ), item["id"]


def test_legacy_body_names_all_resolve_to_the_safe_shared_silhouette() -> None:
    basic = logical_alpha("basic")
    for legacy_name in ("soft", "wide", "plump", "low", "tall"):
        mask = logical_alpha(legacy_name)
        assert list(mask.get_flattened_data()) == list(basic.get_flattened_data())
        assert connected_components(mask) == 1
        assert hole_count(mask) == 0
        assert has_convex_crown(mask)
