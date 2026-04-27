from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class AssetDepositStock(Base):
    __tablename__ = "asset_deposit_stocks"
    __table_args__ = (UniqueConstraint("asset_id", "deposit_id"),)

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)

    asset = relationship("Asset", back_populates="deposit_stocks")
    deposit = relationship("Deposit", back_populates="asset_stocks")
