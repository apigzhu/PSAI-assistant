from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "PIAS"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://pias:pias@localhost:5432/pias"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    llm_default_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_base_url: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
