from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List
from datetime import date
import os

from app.models.time_entry import TimeEntry
from app.models.project import Project
from app.models.task import Task
from app.models.time_entry_ticket import TimeEntryTicket
from app.schemas.time_entry import TimeEntryCreate
from app.services.audit_service import log_event

TIME_ENTRY_MODE_TO_MINUTES = {
    "HOURS": 60,
    "MINUTES_15": 15,
    "MINUTES_30": 30,
}


def _is_multiple_of_interval(hours_value: float, minutes_step: int) -> bool:
    total_minutes = round(hours_value * 60)
    return abs((hours_value * 60) - total_minutes) < 1e-6 and total_minutes % minutes_step == 0


def get_entry_by_id(db: Session, entry_id: str) -> TimeEntry | None:
    return db.query(TimeEntry).filter(TimeEntry.id == entry_id, TimeEntry.deleted_at == None).first()

def get_all_time_entries(db: Session, skip: int = 0, limit: int = 100) -> List[TimeEntry]:
    return db.query(TimeEntry).filter(TimeEntry.deleted_at == None).order_by(TimeEntry.created_at.desc()).offset(skip).limit(limit).all()

def get_user_time_entries(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[TimeEntry]:
    return db.query(TimeEntry).filter(TimeEntry.user_id == user_id, TimeEntry.deleted_at == None).order_by(TimeEntry.created_at.desc()).offset(skip).limit(limit).all()

def get_project_time_entries(db: Session, project_id: str, skip: int = 0, limit: int = 100) -> List[TimeEntry]:
    return db.query(TimeEntry).filter(TimeEntry.project_id == project_id, TimeEntry.deleted_at == None).offset(skip).limit(limit).all()

def _validate_time_entry_business_rules(db: Session, entry_in: TimeEntryCreate, target_user_id: str, is_admin: bool):
    """Capa de validación de dominio para registros de tiempo."""
    # 1. Validar que la fecha no sea futura
    if entry_in.date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register hours for a future date"
        )
    
    # 1b. Restricción de día actual para NO-ADMINS
    if not is_admin and entry_in.date != date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employees can only register hours for the current day. Please contact an admin for past entries."
        )
        
    # 2. Validar rangos de horas
    if entry_in.hours <= 0 or entry_in.hours > 24:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hours must be > 0 and <= 24"
        )
        
    if entry_in.overtime_hours < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Overtime hours must be >= 0"
        )

    # 3. Validar existencia de Proyecto y pertenencia (Omitir borrados)
    project = db.query(Project).filter(Project.id == entry_in.project_id, Project.deleted_at == None).first()
    if not project:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.type != "non-productive":
        is_assigned = any(u.id == target_user_id for u in project.users)
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User is not assigned to project {getattr(project, 'code', '')}"
            )

    # 4. Validar Tarea
    task = db.query(Task).filter(Task.id == entry_in.task_id).first()
    if not task:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # 5. Validar Roles permitido de la tarea (ALLOWED ROLES)
    from app.models.user import User
    from app.models.project_user import ProjectUser
    user = db.query(User).filter(User.id == target_user_id, User.deleted_at == None).first()
    if not user:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not is_admin:
        time_entry_mode = (user.time_entry_mode or "HOURS").strip().upper()
        minutes_step = TIME_ENTRY_MODE_TO_MINUTES.get(time_entry_mode, 60)
        if not _is_multiple_of_interval(float(entry_in.hours), minutes_step):
            if time_entry_mode == "HOURS":
                detail = "This user must register time in full hours."
            elif time_entry_mode == "MINUTES_15":
                detail = "This user must register time in 15-minute intervals."
            else:
                detail = "This user must register time in 30-minute intervals."
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )

    # Obtenemos el rol efectivo (el del proyecto si existe, si no el rol base del usuario)
    project_user = db.query(ProjectUser).filter(
        ProjectUser.project_id == entry_in.project_id,
        ProjectUser.user_id == target_user_id
    ).first()
    
    effective_role = project_user.role if project_user else (user.role or "")

    if task.allowed_roles and not effective_role:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="User must have a role assigned in the selected project"
         )
         
    normalized_role = (effective_role or "").strip().upper()
    normalized_allowed_roles = [(role or "").strip().upper() for role in (task.allowed_roles or [])]

    if task.allowed_roles and normalized_role not in normalized_allowed_roles:
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail=f"User role '{effective_role}' is not allowed for task '{task.code}' (Allowed: {task.allowed_roles})"
         )

    # Validar lógica de Proyectos Oferta - ELIMINADO para permitir tareas según rol


    # 5. Validar tareas de cliente 4XX (requires_extra_fields)
    if getattr(task, "requires_extra_fields", False):
        if entry_in.vehicle_type is None or entry_in.meals is None or entry_in.distance_origin is None:
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST,
                 detail="Tasks requiring extra fields must include vehicle_type, meals, and distance_origin"
             )

    return project, task


def create_time_entry(
    db: Session,
    entry_in: TimeEntryCreate,
    user_id: str,
    is_admin: bool = False,
    commit: bool = True,
) -> TimeEntry:
    # 1. Determinar el user_id final (admin puede sobreescribir)
    target_user_id = user_id
    if is_admin and entry_in.user_id:
        target_user_id = entry_in.user_id

    # 2. Validar reglas de negocio
    project, task = _validate_time_entry_business_rules(db, entry_in, target_user_id, is_admin)

    # 3. Auto-split: máximo 8h normales, el exceso pasa a overtime
    MAX_NORMAL = 8.0
    final_hours = float(entry_in.hours)
    final_overtime = float(entry_in.overtime_hours or 0)
    if final_hours > MAX_NORMAL:
        auto_overtime = final_hours - MAX_NORMAL
        final_hours = MAX_NORMAL
        final_overtime += auto_overtime

    db_entry = TimeEntry(
        user_id=target_user_id,
        project_id=entry_in.project_id,
        task_id=entry_in.task_id,
        date=entry_in.date,
        is_holiday=entry_in.is_holiday,
        hours=final_hours,
        overtime_hours=final_overtime,
        vehicle_type=entry_in.vehicle_type if (is_admin or getattr(task, "requires_extra_fields", False)) else None,
        meals=entry_in.meals if (is_admin or getattr(task, "requires_extra_fields", False)) else None,
        meal_ticket_amount=entry_in.meal_ticket_amount,
        meal_ticket_photo=entry_in.meal_ticket_photo,
        distance_origin=entry_in.distance_origin if (is_admin or getattr(task, "requires_extra_fields", False)) else None,
        trip_type=entry_in.trip_type if (is_admin or getattr(task, "requires_extra_fields", False)) else None,
        travel_time=entry_in.travel_time or 0.0,
    )

    db.add(db_entry)
    db.flush() # Ensure ID is generated for audit log
    
    log_event(db, user_id, "TimeEntry", db_entry.id, "CREATE", 
              changes={"hours": float(db_entry.hours), "date": str(db_entry.date), "task_id": db_entry.task_id})
    
    if commit:
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_entry(db: Session, entry_id: str, actor_id: str | None = None):
    entry = get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found")
        
    entry.deleted_at = func.now()
    db.add(entry)
    
    log_event(db, actor_id, "TimeEntry", entry_id, "SOFT_DELETE")
    
    db.commit()
    return True

def update_entry(db: Session, entry_id: str, entry_in: TimeEntryCreate, actor_id: str | None = None) -> TimeEntry:
    db_entry = get_entry_by_id(db, entry_id)
    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found")

    # Capturar snapshot del estado anterior
    old_values = {
        "hours": float(db_entry.hours),
        "overtime": float(db_entry.overtime_hours),
        "task_id": db_entry.task_id,
        "date": str(db_entry.date)
    }

    target_user_id = entry_in.user_id if entry_in.user_id else db_entry.user_id
    project, task = _validate_time_entry_business_rules(db, entry_in, target_user_id, is_admin=True)

    MAX_NORMAL = 8.0
    final_hours = float(entry_in.hours)
    final_overtime = float(entry_in.overtime_hours or 0)
    if final_hours > MAX_NORMAL:
        auto_overtime = final_hours - MAX_NORMAL
        final_hours = MAX_NORMAL
        final_overtime += auto_overtime

    db_entry.user_id = target_user_id
    db_entry.project_id = entry_in.project_id
    db_entry.task_id = entry_in.task_id
    db_entry.date = entry_in.date
    db_entry.is_holiday = entry_in.is_holiday
    db_entry.hours = final_hours
    db_entry.overtime_hours = final_overtime
    
    # Update logistics and ticket fields
    db_entry.vehicle_type = entry_in.vehicle_type
    db_entry.meals = entry_in.meals
    db_entry.meal_ticket_amount = entry_in.meal_ticket_amount if entry_in.meals else None
    db_entry.distance_origin = entry_in.distance_origin
    db_entry.trip_type = entry_in.trip_type
    db_entry.travel_time = entry_in.travel_time or 0.0
    
    # Note: meal_ticket_photo usually comes from separate upload, but allow setting here if provided
    if entry_in.meal_ticket_photo is not None:
        db_entry.meal_ticket_photo = entry_in.meal_ticket_photo

    if not entry_in.meals:
        for attachment in list(db_entry.ticket_attachments):
            if attachment.file_path.startswith("/uploads/"):
                disk_path = os.path.join("/app", attachment.file_path.lstrip("/"))
                if os.path.exists(disk_path):
                    os.remove(disk_path)
            db.delete(attachment)
        db_entry.meal_ticket_photo = None

    new_values = {
        "hours": final_hours,
        "overtime": final_overtime,
        "task_id": entry_in.task_id,
        "date": str(entry_in.date)
    }

    log_event(db, actor_id, "TimeEntry", db_entry.id, "UPDATE", changes={"old": old_values, "new": new_values})

    db.commit()
    db.refresh(db_entry)
    return db_entry
