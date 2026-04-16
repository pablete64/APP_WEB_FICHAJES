from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base, generate_uuid


class TimeEntryTicket(Base):
    __tablename__ = "time_entry_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    time_entry_id = Column(String(36), ForeignKey("time_entries.id"), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    time_entry = relationship("TimeEntry", back_populates="ticket_attachments")
