import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class AssetStatus(str, enum.Enum):
    DISPONIBLE = "DISPONIBLE"
    ASIGNADO = "ASIGNADO"
    REPARACION = "REPARACION"
    DAÑADO = "DAÑADO"
    PERDIDO = "PERDIDO"

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    asset_type_id = Column(Integer, ForeignKey("asset_types.id"), nullable=False)
    description = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    total_quantity = Column(Integer, default=0, nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    safety_stock = Column(Integer, default=0, nullable=False)
    status = Column(Enum(AssetStatus), default=AssetStatus.DISPONIBLE, nullable=False)
    purchase_date = Column(Date, nullable=True)
    notes = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    asset_type = relationship("AssetType", back_populates="assets")
    movements = relationship("StockMovement", back_populates="asset")
    deposit_stocks = relationship("AssetDepositStock", back_populates="asset")
