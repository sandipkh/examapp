from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://upsc:upsc@localhost:5432/upsc_db"
    REDIS_URL: str = "redis://localhost:6379"

    JWT_SECRET: str = "change-me-jwt-secret"
    JWT_REFRESH_SECRET: str = "change-me-jwt-refresh-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_PLAN_ID_MONTHLY: str = ""
    RAZORPAY_PLAN_ID_ANNUAL: str = ""

    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""

    ADMIN_SECRET_KEY: str = "change-me-admin-secret"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
