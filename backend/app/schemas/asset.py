from pydantic import BaseModel, computed_field
from datetime import datetime, date
from app.models.asset import AssetStatus
from app.schemas.asset_type import AssetTypeResponse

class DepositInAsset(BaseModel):
    id: int
    name: str
    location: str | None = None
    model_config = {"from_attributes": True}

class AssetBase(BaseModel):
    description: str
    asset_type_id: int
    brand: str | None = None
    model: str | None = None
    safety_stock: int = 0
    status: AssetStatus = AssetStatus.DISPONIBLE
    purchase_date: date | None = None
    notes: str | None = None

class AssetCreate(AssetBase):
    initial_stock: int = 0
    deposit_id: int | None = None

class AssetUpdate(BaseModel):
    description: str | None = None
    asset_type_id: int | None = None
    brand: str | None = None
    model: str | None = None
    safety_stock: int | None = None
    status: AssetStatus | None = None
    purchase_date: date | None = None
    notes: str | None = None
    deposit_id: int | None = None

class AssetResponse(BaseModel):
    id: int
    code: str
    description: str
    asset_type_id: int
    asset_type: AssetTypeResponse
    brand: str | None
    model: str | None
    total_quantity: int
    current_stock: int
    safety_stock: int
    status: AssetStatus
    purchase_date: date | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deposit_id: int | None = None
    deposit: DepositInAsset | None = None

    @computed_field
    @property
    def stock_status(self) -> str:
        if self.current_stock == 0:
            return "CRITICO"
        if self.current_stock < self.safety_stock:
            return "BAJO"
        if self.current_stock == self.safety_stock:
            return "MINIMO"
        return "OK"

    model_config = {"from_attributes": True}
