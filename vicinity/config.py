from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://vicinity:vicinity@localhost:5432/vicinity"
    anthropic_api_key: str
    mapbox_token: str
    census_api_key: str | None = None  # public API, no key required
    walkscore_api_key: str
    google_places_api_key: str
    resend_api_key: str
    admin_password: str = "changeme"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
