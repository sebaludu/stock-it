from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class AssetDeletionLog(Base):
    __tablename__ = "asset_deletion_logs"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(20), nullable=False)
    asset_description = Column(String(255), nullable=False)
    asset_type_name = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    total_quantity = Column(Integer, nullable=False, default=0)
    final_stock = Column(Integer, nullable=False, default=0)
    reason = Column(String(500), nullable=True)
    deleted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    deleted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    deleted_by = relationship("User")
