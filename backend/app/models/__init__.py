from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

from .project_user import project_user_table
from .user import User
from .project import Project
from .task import Task
from .time_entry import TimeEntry
from .audit_log import AuditLog
