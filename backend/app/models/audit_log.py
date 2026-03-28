from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.sql import func
from . import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False, index=True) # "TimeEntry", "User", "Project"
    entity_id = Column(String(36), nullable=False, index=True)
    action = Column(String(20), nullable=False) # "CREATE", "UPDATE", "SOFT_DELETE"
    actor_id = Column(String(36), nullable=True, index=True) # User ID performing the action
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    changes = Column(JSON, nullable=True) # { "hours": [8.0, 4.0] } or Snapshot state
