from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.account import router as account_router
from app.api.auth import router as auth_router
from app.api.characters import router as characters_router
from app.api.diary import router as diary_router
from app.api.health import router as health_router
from app.api.room import router as room_router
from app.api.shares import router as shares_router
from app.api.shop import router as shop_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    allowed_origins = [settings.frontend_url]
    if settings.app_env == "development":
        allowed_origins.extend(
            ["http://localhost:5173", "http://127.0.0.1:5173"]
        )
    app = FastAPI(
        title="MOZI API",
        version="0.1.0",
        docs_url="/docs" if settings.app_env == "development" else None,
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(dict.fromkeys(allowed_origins)),
        # In development, also allow the frontend opened from a phone on the
        # same Wi-Fi (private network addresses only).
        allow_origin_regex=(
            r"http://(192\.168(\.\d{1,3}){2}|10(\.\d{1,3}){3}"
            r"|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}):5173"
            if settings.app_env == "development"
            else None
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(account_router)
    app.include_router(diary_router)
    app.include_router(characters_router)
    app.include_router(room_router)
    app.include_router(shares_router)
    app.include_router(shop_router)
    return app


app = create_app()
