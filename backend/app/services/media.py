from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings

ALLOWED_IMAGES: dict[str, tuple[str, bytes]] = {
    "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
    "image/jpeg": ("jpg", b"\xff\xd8\xff"),
    "image/webp": ("webp", b"RIFF"),
    "image/gif": ("gif", b"GIF8"),
    "image/avif": ("avif", b"ftyp"),
}
MAX_DIARY_IMAGE_BYTES = 20 * 1024 * 1024


class MediaValidationError(ValueError):
    pass


def media_directory(kind: str) -> Path:
    root = get_settings().effective_media_root
    directory = (root / kind).resolve()
    if root not in directory.parents:
        raise RuntimeError("Invalid media directory")
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def validate_image(data: bytes, content_type: str, max_bytes: int) -> str:
    normalized = content_type.split(";", 1)[0].strip().lower()
    if normalized not in ALLOWED_IMAGES:
        raise MediaValidationError("PNG, JPEG, WebP, GIF, AVIF 이미지만 첨부할 수 있어요. HEIC는 JPEG로 변환해 주세요.")
    if not data:
        raise MediaValidationError("비어 있는 이미지 파일은 첨부할 수 없어요.")
    if len(data) > max_bytes:
        raise MediaValidationError(f"이미지 크기는 {max_bytes // (1024 * 1024)}MB 이하여야 해요.")
    extension, signature = ALLOWED_IMAGES[normalized]
    if normalized == "image/avif":
        valid_avif = len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in {b"avif", b"avis"}
        if not valid_avif:
            raise MediaValidationError("올바른 AVIF 이미지가 아니에요.")
    elif not data.startswith(signature):
        raise MediaValidationError("파일 내용과 이미지 형식이 일치하지 않아요.")
    if normalized == "image/webp" and (len(data) < 12 or data[8:12] != b"WEBP"):
        raise MediaValidationError("올바른 WebP 이미지가 아니에요.")
    return extension


def store_image(kind: str, data: bytes, content_type: str, max_bytes: int) -> tuple[str, str]:
    extension = validate_image(data, content_type, max_bytes)
    stored_name = f"{uuid4().hex}.{extension}"
    path = media_directory(kind) / stored_name
    path.write_bytes(data)
    return stored_name, content_type.split(";", 1)[0].strip().lower()


def media_path(kind: str, stored_name: str) -> Path | None:
    directory = media_directory(kind)
    path = (directory / Path(stored_name).name).resolve()
    if directory not in path.parents or not path.is_file():
        return None
    return path


def delete_media(kind: str, stored_name: str | None) -> None:
    if not stored_name:
        return
    path = media_path(kind, stored_name)
    if path is not None:
        path.unlink(missing_ok=True)
