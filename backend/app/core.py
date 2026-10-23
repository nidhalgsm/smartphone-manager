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


def apply_search(qry, q):
    import re
    if q:
        if not re.fullmatch(r"[\w .-]{1,40}", q):
            raise HTTPException(400, "Invalid search text")
        qry = qry.or_(f"imei1.ilike.%{q}%,imei2.ilike.%{q}%,serial_number.ilike.%{q}%,"
                      f"model.ilike.%{q}%,supplier_name.ilike.%{q}%")
    return qry


def paged(qry, page, page_size):
    page, page_size = max(1, page), min(max(1, page_size), 50)
    start = (page - 1) * page_size
    try:
        r = qry.range(start, start + page_size - 1).execute()
        items = r.data
    except Exception:  # page beyond the last one
        r, items = qry.range(0, 0).execute(), []
    return items, (r.count or 0), page, page_size


def clean_date(s):
    import re
    if s and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        raise HTTPException(400, "Invalid date")
    return s
