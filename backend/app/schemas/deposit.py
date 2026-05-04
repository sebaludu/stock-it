from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Literal

EnvironmentType = Literal["DEV", "TEST", "STAGE", "PROD"]

class DepositBase(BaseModel):
    name: str
    description: str | None = None
    location: str | None = None
    environment: EnvironmentType | None = None
    alert_email: str | None = None

class DepositCreate(DepositBase):
    pass

class DepositUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    environment: EnvironmentType | None = None
    alert_email: str | None = None

class DepositResponse(DepositBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class DepositTransferCreate(BaseModel):
    asset_id: int
    from_deposit_id: int
    to_deposit_id: int
    quantity: int
    reason: str | None = None

class DepositTransferResponse(BaseModel):
    id: int
    asset_id: int
    asset_code: str
    asset_description: str
    from_deposit_id: int
    from_deposit_name: str
    to_deposit_id: int
    to_deposit_name: str
    quantity: int
    reason: str | None
    operator_name: str
    timestamp: datetime
