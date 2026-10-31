import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ...core import sb, current_user, audit, apply_search, paged, clean_date
from ...schemas import DeviceIn

router = APIRouter(prefix="/devices", tags=["devices"])
now = lambda: datetime.now(timezone.utc).isoformat()


def _find_duplicate(d: DeviceIn, exclude_id=None):
    for val in (d.imei1, d.imei2, d.serial_number):
        if val:
            hits = sb.table("devices").select("id").is_("deleted_at", "null").or_(
                f"imei1.eq.{val},imei2.eq.{val},serial_number.eq.{val}").execute().data
            if any(h["id"] != exclude_id for h in hits):
                return val
    return None


def _get(device_id):
    rows = sb.table("devices").select("*").eq("id", device_id).is_("deleted_at", "null").execute().data
    if not rows:
        raise HTTPException(404, "Phone not found")
    return rows[0]


@router.post("", status_code=201)
def create_device(d: DeviceIn, user=Depends(current_user)):
    dup = _find_duplicate(d)
    if dup:
        raise HTTPException(409, f"This phone already exists ({dup})")
    row = sb.table("devices").insert(d.model_dump(exclude_none=True)).execute().data[0]
    audit(user, "device.create", "device", row["id"], d.model or "")
    return row


@router.get("")
def list_devices(status: Optional[str] = None, category: Optional[str] = None, q: Optional[str] = None,
                 page: int = 1, page_size: int = 10, date_from: Optional[str] = None,
                 date_to: Optional[str] = None, user=Depends(current_user)):
    qry = sb.table("devices").select("*", count="exact").is_("deleted_at", "null").order("created_at", desc=True)
    if status:
        qry = qry.eq("status", status)
    if category:
        qry = qry.eq("category", category)
    if clean_date(date_from):
        qry = qry.gte("purchase_date", date_from)
    if clean_date(date_to):
        qry = qry.lte("purchase_date", date_to + "T23:59:59")
    items, total, page, page_size = paged(apply_search(qry, q), page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/lookup/{code}")
def lookup(code: str, user=Depends(current_user)):
    if not re.fullmatch(r"[A-Za-z0-9]{4,40}", code):
        raise HTTPException(400, "Invalid code")
    rows = sb.table("devices").select("*").is_("deleted_at", "null").or_(
        f"imei1.eq.{code},imei2.eq.{code},serial_number.eq.{code}").execute().data
    if not rows:
        raise HTTPException(404, "No phone with this IMEI / Serial Number")
    return rows[0]


@router.get("/{device_id}")
def read_device(device_id: str, user=Depends(current_user)):
    return _get(device_id)


@router.patch("/{device_id}")
def update_device(device_id: str, d: DeviceIn, user=Depends(current_user)):
    _get(device_id)
    dup = _find_duplicate(d, exclude_id=device_id)
    if dup:
        raise HTTPException(409, f"Another phone already uses {dup}")
    data = d.model_dump()
    data["updated_at"] = now()
    row = sb.table("devices").update(data).eq("id", device_id).execute().data[0]
    audit(user, "device.update", "device", device_id, d.model or "")
    return row


@router.delete("/{device_id}")
def delete_device(device_id: str, user=Depends(current_user)):
    cur = _get(device_id)
    if cur["status"] != "in_stock":
        raise HTTPException(409, "Sold phones are kept for the sales history")
    sb.table("devices").update({"deleted_at": now(), "updated_at": now()}).eq("id", device_id).execute()
    audit(user, "device.delete", "device", device_id, cur.get("model") or "")
    return {"ok": True}
