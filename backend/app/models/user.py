from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base, generate_uuid
from .project_user import project_user_table

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    home_location = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True) # Soft delete Column

    projects = relationship("Project", secondary=project_user_table, back_populates="users")
    time_entries = relationship("TimeEntry", back_populates="user")
