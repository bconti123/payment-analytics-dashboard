from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    app_name: str = "Payment Analytics Dashboard API"
    debug: bool = False
    anthropic_api_key: str | None = None

    jwt_secret: str = "dev-only-do-not-use-in-production-change-me-please"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 60


settings = Settings()
