from sqlalchemy import Column, String, Boolean, Numeric, Date, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base, generate_uuid
from .project_user import project_user_table

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    location = Column(String(255), nullable=True)
    distance_from_workshop = Column(Numeric(8, 2), default=0.0)
    travel_time_to = Column(Integer, default=0, nullable=True)    # minutos de ida
    travel_time_from = Column(Integer, default=0, nullable=True)  # minutos de vuelta
    start_date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True) # Soft delete Column

    users = relationship("User", secondary=project_user_table, back_populates="projects")
    time_entries = relationship("TimeEntry", back_populates="project")
