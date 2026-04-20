from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date

class ProjectUserAssignment(BaseModel):
    user_id: str
    role: str

class ProjectBase(BaseModel):
    name: str
    code: str
    client: Optional[str] = None
    location: Optional[str] = None
    distance_from_workshop: float = 0.0
    travel_time: Optional[int] = 0           # minutos de ida (el servicio lo multiplicará x2)
    start_date: date
    type: str
    km_rate: float = 0.19
    daily_allowance_rate: float = 37.40

class ProjectCreate(ProjectBase):
    # En la creación esperamos una lista de dicts
    assigned_users: List[ProjectUserAssignment] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    client: Optional[str] = None
    location: Optional[str] = None
    distance_from_workshop: Optional[float] = None
    travel_time: Optional[int] = None
    start_date: Optional[date] = None
    type: Optional[str] = None
    km_rate: Optional[float] = None
    daily_allowance_rate: Optional[float] = None
    assigned_users: Optional[List[ProjectUserAssignment]] = None

class ProjectResponse(ProjectBase):
    id: str
    is_active: bool
    # Modificamos la respuesta para mostrar usuarios con sus roles
    assigned_users: List[ProjectUserAssignment] = []
    
    model_config = ConfigDict(from_attributes=True)
