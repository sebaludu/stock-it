from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    asset_stocks = relationship("AssetDepositStock", back_populates="deposit")
    user_deposits = relationship("UserDeposit", back_populates="deposit")
    transfers_from = relationship("DepositTransfer", foreign_keys="DepositTransfer.from_deposit_id", back_populates="from_deposit")
    transfers_to = relationship("DepositTransfer", foreign_keys="DepositTransfer.to_deposit_id", back_populates="to_deposit")
