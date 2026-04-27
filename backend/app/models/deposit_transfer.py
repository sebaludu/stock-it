from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class DepositTransfer(Base):
    __tablename__ = "deposit_transfers"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    from_deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    to_deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(500), nullable=True)
    operator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    asset = relationship("Asset")
    from_deposit = relationship("Deposit", foreign_keys=[from_deposit_id], back_populates="transfers_from")
    to_deposit = relationship("Deposit", foreign_keys=[to_deposit_id], back_populates="transfers_to")
    operator = relationship("User")
