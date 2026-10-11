from fastapi import Header, HTTPException
from pydantic_settings import BaseSettings
from supabase import create_client


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    cors_origins: str = "http://localhost:5500"
    model_config = {"env_file": ".env"}


settings = Settings()
sb = create_client(settings.supabase_url, settings.supabase_service_key)


def current_user(authorization: str = Header(None)):
    """Validates the Supabase Auth JWT sent by the browser."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        res = sb.auth.get_user(authorization[7:])
        if not res or not res.user:
            raise ValueError
    except Exception:
        raise HTTPException(401, "Invalid or expired session")
    return res.user


def audit(user, action, entity_type, entity_id, summary=""):
    sb.table("audit_log").insert({
        "user_id": user.id, "action": action, "entity_type": entity_type,
        "entity_id": str(entity_id), "summary": summary}).execute()
