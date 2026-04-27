import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class MovementType(str, enum.Enum):
    INGRESO = "INGRESO"
    EGRESO = "EGRESO"
    DEVOLUCION = "DEVOLUCION"

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(500), nullable=False)
    notes = Column(String(500), nullable=True)
    operator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    asset = relationship("Asset", back_populates="movements")
    operator = relationship("User", foreign_keys=[operator_user_id], back_populates="movements_operated")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="movements_targeted")
    deposit = relationship("Deposit")
