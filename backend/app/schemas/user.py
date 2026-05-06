from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class AssignedProjectRole(BaseModel):
    project_id: str
    project_name: str
    project_code: str
    role: str

class UserBase(BaseModel):
    employee_code: str
    name: str
    home_location: Optional[str] = None
    role: str

class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False
    is_super_admin: Optional[bool] = False
    time_entry_mode: Optional[str] = "HOURS"

class UserUpdateProjectRole(BaseModel):
    project_id: str
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    home_location: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_super_admin: Optional[bool] = None
    time_entry_mode: Optional[str] = None
    assigned_projects: Optional[List[UserUpdateProjectRole]] = None

class UserResponse(UserBase):
    id: str
    is_admin: bool
    is_super_admin: bool
    time_entry_mode: str
    created_at: datetime
    assigned_projects: List[AssignedProjectRole] = []
    
    model_config = ConfigDict(from_attributes=True)
