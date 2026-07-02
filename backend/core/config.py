from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    MONGODB_URI: str = ""
    JWT_SECRET: str = "fallback_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080

    class Config:
        env_file = ".env"

settings = Settings()
