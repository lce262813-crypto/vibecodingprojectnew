from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_env: str = "development"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    database_url: str = ""
    session_cookie_name: str = "mozi_session"
    session_ttl_days: int = 7
    session_cookie_secure: bool = False
    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    ai_analysis_mode: str = "live"
    demo_account_email: str = "presentation@mozi-demo.com"
    media_root: str = ""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def effective_database_url(self) -> str:
        if self.database_url.strip():
            return self.database_url.strip()
        local_database = (PROJECT_ROOT / "backend" / "mozi.db").as_posix()
        return f"sqlite+pysqlite:///{local_database}"

    @property
    def effective_media_root(self) -> Path:
        if self.media_root.strip():
            return Path(self.media_root).expanduser().resolve()
        return (PROJECT_ROOT / "backend" / "private_uploads").resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
