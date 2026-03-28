import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Control Horario API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/timeflow")
    SECRET_KEY: str  # Required
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    ALLOWED_ORIGINS: str = "http://localhost:8080"

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def validate_origins(cls, v):
        if "*" in v:
            raise ValueError("Insecure CORS configuration: '*' cannot be used with allow_credentials=True")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v):
        if not v or v.strip() == "":
            raise ValueError("SECRET_KEY cannot be empty")
        # Prevenir secretos inseguros o por defecto
        if "super-secret-key-change-it" in v or len(v) < 32:
            raise ValueError("SECRET_KEY is too short or insecure. Must be at least 32 characters and distinct from default placeholders.")
        return v

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
