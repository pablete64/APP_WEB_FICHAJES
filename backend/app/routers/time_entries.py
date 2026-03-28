from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryResponse
from app.services import time_entry_service

router = APIRouter(prefix="/time-entries", tags=["Time Entries"])

@router.post("/", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(entry: TimeEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crea un nuevo registro de horas para el usuario autenticado"""
    return time_entry_service.create_time_entry(db, entry_in=entry, user_id=current_user.id, is_admin=current_user.is_admin)

@router.get("/", response_model=List[TimeEntryResponse])
def get_all_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Devuelve los registros de horas en global (solo admins)"""
    return time_entry_service.get_all_time_entries(db, skip=skip, limit=limit)

@router.get("/me", response_model=List[TimeEntryResponse])
def get_my_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Devuelve los registros de horas realizados por el usuario logado"""
    return time_entry_service.get_user_time_entries(db, current_user.id, skip=skip, limit=limit)

@router.get("/project/{project_id}", response_model=List[TimeEntryResponse])
def get_entries_by_project(project_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Devuelve registros de horas de un proyecto. Solo administrador."""
    return time_entry_service.get_project_time_entries(db, project_id, skip=skip, limit=limit)

@router.get("/user/{user_id}", response_model=List[TimeEntryResponse])
def get_entries_by_user(user_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Devuelve registros de horas de un usuario. Solo administrador."""
    return time_entry_service.get_user_time_entries(db, user_id, skip=skip, limit=limit)

@router.put("/{entry_id}", response_model=TimeEntryResponse)
def update_time_entry(entry_id: str, entry: TimeEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Actualiza un registro de horas. Solo administrador."""
    return time_entry_service.update_entry(db, entry_id, entry, actor_id=current_user.id)

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_entry(entry_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Borrar un impute de horas físico. Solo administrador."""
    time_entry_service.delete_entry(db, entry_id, actor_id=current_user.id)
    return None
