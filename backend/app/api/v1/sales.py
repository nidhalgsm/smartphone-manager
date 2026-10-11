from fastapi import APIRouter, Depends, HTTPException
from ...core import sb, current_user, audit
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
            raise HTTPException(409, "This device is not in stock (already sold?)")
        raise HTTPException(400, "Sale failed")
    audit(user, "sale.create", "sale", res.data, f"device {s.device_id}")
    return {"sale_id": res.data}


@router.get("")
def list_sales(user=Depends(current_user)):
    return sb.table("sales").select("*, devices(model, imei1, category, purchase_price)") \
        .order("sale_date", desc=True).limit(500).execute().data
