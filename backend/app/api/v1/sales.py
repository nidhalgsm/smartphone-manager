from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ...core import sb, current_user, audit, apply_search, paged
from ...schemas import SaleIn

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("", status_code=201)
def create_sale(s: SaleIn, user=Depends(current_user)):
    try:
        res = sb.rpc("sell_device", {
            "p_device_id": s.device_id, "p_price": s.sale_price,
            "p_seller": s.seller_name or user.email, "p_notes": s.notes}).execute()
    except Exception as e:
        if "DEVICE_NOT_AVAILABLE" in str(e):
            raise HTTPException(409, "This phone is not in stock (already sold?)")
        raise HTTPException(400, "Sale failed")
    audit(user, "sale.create", "sale", res.data, f"device {s.device_id}")
    return {"sale_id": res.data}


@router.get("")
def list_sales(q: Optional[str] = None, page: int = 1, page_size: int = 10, user=Depends(current_user)):
    """Sold phones: device data + sale data, newest sale first, paginated."""
    qry = sb.table("devices").select("*, sales!inner(*)", count="exact") \
        .eq("status", "sold").order("updated_at", desc=True)
    items, total, page, page_size = paged(apply_search(qry, q), page, page_size)
    for d in items:
        s = d.pop("sales")
        d["sale"] = max(s, key=lambda x: x["sale_date"]) if isinstance(s, list) else s
    return {"items": items, "total": total, "page": page, "page_size": page_size}
