from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class UserDeposit(Base):
    __tablename__ = "user_deposits"
    __table_args__ = (UniqueConstraint("user_id", "deposit_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)

    user = relationship("User", back_populates="user_deposits")
    deposit = relationship("Deposit", back_populates="user_deposits")
