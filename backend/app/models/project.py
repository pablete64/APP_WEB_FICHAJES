from sqlalchemy import Column, String, Boolean, Numeric, Date, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base, generate_uuid
from .project_user import ProjectUser

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    client = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    distance_from_workshop = Column(Numeric(8, 2), default=0.0)
    travel_time = Column(Integer, default=0, nullable=True) # tiempo total ida+vuelta (minutos)
    km_rate = Column(Numeric(8, 2), default=0.19)
    daily_allowance_rate = Column(Numeric(8, 2), default=37.40)
    start_date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True) # Soft delete Column

    user_associations = relationship("ProjectUser", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="project")

    @property
    def users(self):
        return [assoc.user for assoc in self.user_associations]

    @property
    def assigned_users(self) -> list[dict]:
        return [{"user_id": assoc.user_id, "role": assoc.role} for assoc in self.user_associations]
