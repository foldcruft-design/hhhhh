"""
Конфигурация Telegram-бота для GEOINT анализа.
Загрузка переменных окружения и типизированных настроек.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    bot_token: str = "YOUR_BOT_TOKEN_HERE"
    gemini_api_key: str = ""
    admin_ids: List[int] = []
    database_path: str = "geoint_bot.db"
    gemini_model: str = "gemini-3.8-flash"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("admin_ids", mode="before")
    def parse_admin_ids(cls, v):
        if isinstance(v, str):
            if not v.strip():
                return []
            return [int(x.strip()) for x in v.split(",") if x.strip().isdigit()]
        if isinstance(v, int):
            return [v]
        return v or []

    def is_admin(self, user_id: int) -> bool:
        return user_id in self.admin_ids


# Базовая директория бота
BASE_DIR = Path(__file__).resolve().parent

# Экземпляр настроек
settings = Settings()
