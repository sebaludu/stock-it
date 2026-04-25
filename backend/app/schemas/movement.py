from pydantic import BaseModel
from datetime import datetime
from app.models.movement import MovementType
from app.schemas.user import UserResponse
from app.schemas.asset import AssetResponse

class MovementCreate(BaseModel):
    asset_id: int
    movement_type: MovementType
    quantity: int
    reason: str
    notes: str | None = None
    target_user_id: int | None = None

class MovementResponse(BaseModel):
    id: int
    asset_id: int
    asset: AssetResponse
    movement_type: MovementType
    quantity: int
    reason: str
    notes: str | None
    operator_user_id: int
    operator: UserResponse
    target_user_id: int | None
    target_user: UserResponse | None
    timestamp: datetime

    model_config = {"from_attributes": True}
