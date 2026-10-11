import re
from typing import Literal, Optional
from pydantic import BaseModel, field_validator, model_validator


def luhn_ok(s: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(s)):
        d = int(ch)
        if i % 2 == 1:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        total += d
    return total % 10 == 0


class DeviceIn(BaseModel):
    category: Literal["tunisien", "parallele"]
    imei1: Optional[str] = None
    imei2: Optional[str] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    supplier_name: Optional[str] = None
    purchase_price: Optional[float] = None
    expected_sale_price: Optional[float] = None
    notes: Optional[str] = None

    @field_validator("imei1", "imei2", "serial_number", "model", "supplier_name", "notes", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        v = (v or "").strip() if isinstance(v, str) or v is None else str(v)
        return v or None

    @field_validator("imei1", "imei2")
    @classmethod
    def imei_format(cls, v):  # kept as TEXT: leading zeros preserved
        if v is None:
            return v
        if not re.fullmatch(r"\d{15}", v) or not luhn_ok(v):
            raise ValueError("IMEI must be 15 digits with a valid check digit")
        return v

    @model_validator(mode="after")
    def need_identifier(self):
        if not self.imei1 and not self.serial_number:
            raise ValueError("Provide at least an IMEI 1 or a Serial Number")
        return self


class SaleIn(BaseModel):
    device_id: str
    sale_price: Optional[float] = None
    seller_name: Optional[str] = None
    notes: Optional[str] = None
