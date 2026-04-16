from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os, uuid, shutil

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import TimeEntryCreate, TimeEntryResponse
from app.services import time_entry_service

UPLOADS_DIR = "/app/uploads/tickets"
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_UPLOAD_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
    "application/octet-stream",
}

ALLOWED_UPLOAD_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
}


def _is_allowed_ticket_upload(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    extension = os.path.splitext(file.filename or "")[1].lower()

    if content_type in ALLOWED_UPLOAD_MIME_TYPES and (extension in ALLOWED_UPLOAD_EXTENSIONS or not extension):
        return True

    return extension in ALLOWED_UPLOAD_EXTENSIONS

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

@router.post("/{entry_id}/upload-ticket", response_model=TimeEntryResponse)
def upload_ticket_photo(
    entry_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sube la foto del ticket de dieta y la asocia al fichaje."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id, TimeEntry.deleted_at == None).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Fichaje no encontrado")
    # Only the owner or an admin can upload
    if entry.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sin permiso")

    if not _is_allowed_ticket_upload(file):
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG, PNG, WebP, HEIC o HEIF.")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(UPLOADS_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    entry.meal_ticket_photo = f"/uploads/tickets/{filename}"
    db.commit()
    db.refresh(entry)
    return entry
