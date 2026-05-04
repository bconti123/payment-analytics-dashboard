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

    # Localhost dev origins are always allowed. Set CORS_EXTRA_ORIGINS to a
    # comma-separated list (e.g. https://my-app.vercel.app) to extend.
    cors_extra_origins: str = ""

    @property
    def cors_allow_origins(self) -> list[str]:
        defaults = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        extras = [o.strip() for o in self.cors_extra_origins.split(",") if o.strip()]
        return defaults + extras


settings = Settings()
