from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List
from datetime import date as date_type
import os, uuid, shutil

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.time_entry import TimeEntry
from app.models.time_entry_ticket import TimeEntryTicket
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


def _get_entry_or_403(db: Session, entry_id: str, current_user: User) -> TimeEntry:
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id, TimeEntry.deleted_at == None).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Fichaje no encontrado")
    if entry.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sin permiso")
    return entry


def _sync_primary_ticket_photo(entry: TimeEntry) -> None:
    attachments = sorted(
        entry.ticket_attachments,
        key=lambda attachment: attachment.created_at.isoformat() if attachment.created_at else "",
        reverse=True,
    )
    entry.meal_ticket_photo = attachments[0].file_path if attachments else None


def _save_ticket_attachment(db: Session, entry: TimeEntry, file: UploadFile) -> str:
    if not _is_allowed_ticket_upload(file):
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG, PNG, WebP, HEIC o HEIF.")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(UPLOADS_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    attachment = TimeEntryTicket(
        time_entry_id=entry.id,
        file_path=f"/uploads/tickets/{filename}",
        original_filename=file.filename,
    )
    db.add(attachment)
    db.flush()
    entry.ticket_attachments.append(attachment)
    _sync_primary_ticket_photo(entry)
    return dest

router = APIRouter(prefix="/time-entries", tags=["Time Entries"])

@router.post("/", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(entry: TimeEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crea un nuevo registro de horas para el usuario autenticado"""
    return time_entry_service.create_time_entry(db, entry_in=entry, user_id=current_user.id, is_admin=current_user.is_admin)


@router.post("/with-tickets", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry_with_tickets(
    project_id: str = Form(...),
    task_id: str = Form(...),
    date: str = Form(...),
    hours: float = Form(...),
    overtime_hours: float = Form(0.0),
    is_holiday: bool = Form(False),
    vehicle_type: str | None = Form(None),
    meals: bool | None = Form(None),
    meal_ticket_amount: float | None = Form(None),
    meal_ticket_photo: str | None = Form(None),
    distance_origin: str | None = Form(None),
    trip_type: str | None = Form(None),
    travel_time: float | None = Form(0.0),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea un fichaje junto con sus tickets en una sola operación."""
    if meals is True and not files and not current_user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="Debes adjuntar al menos un ticket para imputar una dieta.",
        )

    try:
        entry_date = date_type.fromisoformat(date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Fecha no válida") from exc

    entry_in = TimeEntryCreate(
        project_id=project_id,
        task_id=task_id,
        date=entry_date,
        hours=hours,
        overtime_hours=overtime_hours,
        is_holiday=is_holiday,
        vehicle_type=vehicle_type,
        meals=meals,
        meal_ticket_amount=meal_ticket_amount,
        meal_ticket_photo=meal_ticket_photo,
        distance_origin=distance_origin,
        trip_type=trip_type,
        travel_time=travel_time,
    )

    saved_paths: List[str] = []
    try:
        entry = time_entry_service.create_time_entry(
            db,
            entry_in=entry_in,
            user_id=current_user.id,
            is_admin=current_user.is_admin,
            commit=False,
        )
        for file in files:
            saved_paths.append(_save_ticket_attachment(db, entry, file))
        db.commit()
        db.refresh(entry)
        return entry
    except Exception:
        db.rollback()
        for saved_path in saved_paths:
            if os.path.exists(saved_path):
                os.remove(saved_path)
        raise

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
    entry = _get_entry_or_403(db, entry_id, current_user)
    _save_ticket_attachment(db, entry, file)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}/ticket-attachments/{attachment_id}", response_model=TimeEntryResponse)
def delete_ticket_attachment(
    entry_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borra un ticket adjunto de un fichaje."""
    entry = _get_entry_or_403(db, entry_id, current_user)
    attachment = next((item for item in entry.ticket_attachments if item.id == attachment_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Ticket adjunto no encontrado")

    if attachment.file_path.startswith("/uploads/"):
        disk_path = os.path.join("/app", attachment.file_path.lstrip("/"))
        if os.path.exists(disk_path):
            os.remove(disk_path)

    db.delete(attachment)
    db.flush()
    _sync_primary_ticket_photo(entry)
    db.commit()
    db.refresh(entry)
    return entry
