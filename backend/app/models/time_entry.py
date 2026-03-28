from sqlalchemy import Column, String, Boolean, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base, generate_uuid

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    
    date = Column(Date, nullable=False, index=True)
    is_holiday = Column(Boolean, default=False)
    hours = Column(Numeric(4, 2), nullable=False)
    overtime_hours = Column(Numeric(4, 2), default=0.0)
    
    vehicle_type = Column(String(20), nullable=True)
    meals = Column(Boolean, nullable=True)
    distance_origin = Column(String(20), nullable=True)
    trip_type = Column(String(10), nullable=True) # "to", "from", "round"
    travel_time = Column(Numeric(4, 2), default=0.0, nullable=True)  # Admin-managed travel time (hours)

    @property
    def total_hours(self) -> float:
        return (self.hours or 0.0) + (self.overtime_hours or 0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True) # Soft delete Column

    user = relationship("User", back_populates="time_entries")
    project = relationship("Project", back_populates="time_entries")
    task = relationship("Task", back_populates="time_entries")
