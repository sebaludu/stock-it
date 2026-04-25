from pydantic import BaseModel
from datetime import datetime

class AssetTypeBase(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None

class AssetTypeCreate(AssetTypeBase):
    pass

class AssetTypeResponse(AssetTypeBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}
