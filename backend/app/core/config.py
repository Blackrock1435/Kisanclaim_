from __future__ import annotations
import logging
import secrets
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger("kisanclaim")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./kisanclaim.db"
    secret_key: str = "kisanclaim-secure-pmfby-secret-key-2026-prod-stable"
    access_token_minutes: int = 60 * 8
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
    upload_dir: str = "./storage"
    max_upload_mb: int = 10
    public_base_url: str = "http://localhost:5173"
    # Satellite: real analysis needs Google Earth Engine credentials.
    gee_project: str = ""
    gee_service_account: str = ""
    gee_private_key_file: str = ""
    # Demo mode: when true AND GEE is not configured, the satellite step returns
    # the *illustrative* series from the pitch deck, always flagged as demo data.
    allow_demo_data: bool = True
    open_meteo_url: str = "https://archive-api.open-meteo.com/v1/archive"

    @property
    def gee_configured(self) -> bool:
        return bool(self.gee_project and self.gee_service_account and self.gee_private_key_file)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if not s.secret_key:
        s.secret_key = secrets.token_urlsafe(48)
        log.warning("SECRET_KEY not set - generated an ephemeral key (tokens reset on restart).")
    return s
