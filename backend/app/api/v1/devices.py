import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ...core import sb, current_user, audit
from ...schemas import DeviceIn

router = APIRouter(prefix="/devices", tags=["devices"])


def _find_duplicate(d: DeviceIn):
    for col, val in (("imei1", d.imei1), ("imei2", d.imei2), ("serial_number", d.serial_number)):
        if val:
            hit = sb.table("devices").select("id").or_(
                f"imei1.eq.{val},imei2.eq.{val},serial_number.eq.{val}").execute().data
            if hit:
                return val
    return None


@router.post("", status_code=201)
def create_device(d: DeviceIn, user=Depends(current_user)):
    dup = _find_duplicate(d)
    if dup:
        raise HTTPException(409, f"Device already exists ({dup})")
    row = sb.table("devices").insert(d.model_dump(exclude_none=True)).execute().data[0]
    audit(user, "device.create", "device", row["id"], d.model or "")
    return row


@router.get("")
def list_devices(status: Optional[str] = None, category: Optional[str] = None,
                 q: Optional[str] = None, user=Depends(current_user)):
    qry = sb.table("devices").select("*").is_("deleted_at", "null").order("created_at", desc=True)
    if status:
        qry = qry.eq("status", status)
    if category:
        qry = qry.eq("category", category)
    if q:
        if not re.fullmatch(r"[\w .-]{1,40}", q):
            raise HTTPException(400, "Invalid search text")
        qry = qry.or_(f"imei1.ilike.%{q}%,imei2.ilike.%{q}%,serial_number.ilike.%{q}%,model.ilike.%{q}%,supplier_name.ilike.%{q}%")
    return qry.limit(500).execute().data


@router.get("/lookup/{code}")
def lookup(code: str, user=Depends(current_user)):
    if not re.fullmatch(r"[A-Za-z0-9]{4,40}", code):
        raise HTTPException(400, "Invalid code")
    rows = sb.table("devices").select("*").is_("deleted_at", "null").or_(
        f"imei1.eq.{code},imei2.eq.{code},serial_number.eq.{code}").execute().data
    if not rows:
        raise HTTPException(404, "No device with this IMEI / Serial Number")
    return rows[0]
