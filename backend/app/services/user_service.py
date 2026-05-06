from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.auth.security import get_password_hash
from app.services.audit_service import log_event

DEFAULT_ADMIN_ROLE = "MANAGEMENT"
ALLOWED_TIME_ENTRY_MODES = {"HOURS", "MINUTES_15", "MINUTES_30"}


def _get_actor(db: Session, actor_id: str | None) -> User | None:
    if not actor_id:
        return None
    return get_user_by_id(db, actor_id)


def _ensure_super_admin_can_manage_admin_flags(
    db: Session,
    actor_id: str | None,
    requested_is_admin: bool | None,
    requested_is_super_admin: bool | None = None,
) -> None:
    actor = _get_actor(db, actor_id)
    wants_admin_change = requested_is_admin is True or requested_is_super_admin is True
    if wants_admin_change and (not actor or not actor.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un super admin puede crear administradores."
        )


def _normalize_time_entry_mode(value: str | None) -> str:
    normalized = (value or "HOURS").strip().upper()
    if normalized not in ALLOWED_TIME_ENTRY_MODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time entry mode"
        )
    return normalized


def _normalize_admin_role(role: str | None) -> str:
    normalized = (role or "").strip()
    if normalized.upper() == "MANAGEMENT" or normalized == "":
        return DEFAULT_ADMIN_ROLE
    return normalized


def get_user_by_employee_code(db: Session, employee_code: str) -> User | None:
    return db.query(User).filter(User.employee_code == employee_code, User.deleted_at == None).first()

def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id, User.deleted_at == None).first()

def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).filter(User.deleted_at == None).offset(skip).limit(limit).all()

def create_user(db: Session, user_in: UserCreate, actor_id: str | None = None) -> User:
    if get_user_by_employee_code(db, employee_code=user_in.employee_code):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee code already exists"
        )

    _ensure_super_admin_can_manage_admin_flags(
        db,
        actor_id=actor_id,
        requested_is_admin=user_in.is_admin,
        requested_is_super_admin=user_in.is_super_admin,
    )

    if user_in.is_super_admin:
        user_in.is_admin = True

    if user_in.is_admin:
        user_in.role = _normalize_admin_role(user_in.role)
    user_in.time_entry_mode = _normalize_time_entry_mode(user_in.time_entry_mode)
    
    db_user = User(
        employee_code=user_in.employee_code,
        name=user_in.name,
        home_location=user_in.home_location,
        role=user_in.role,
        is_admin=user_in.is_admin,
        is_super_admin=user_in.is_super_admin,
        time_entry_mode=user_in.time_entry_mode,
        password_hash=get_password_hash(user_in.password)
    )
    db.add(db_user)
    db.flush() # ID generation
    
    log_event(db, actor_id, "User", db_user.id, "CREATE", changes={"employee_code": user_in.employee_code})
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: str, actor_id: str | None = None) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    actor = _get_actor(db, actor_id)

    if user.is_super_admin and actor_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los super admins no pueden ser eliminados por otros usuarios."
        )

    if user.is_admin and actor_id and actor_id != user_id and (not actor or not actor.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un super admin puede eliminar administradores."
        )

    user.deleted_at = func.now()
    db.add(user)
    
    log_event(db, actor_id, "User", user_id, "SOFT_DELETE")
    
    db.commit()
    return True
def update_user(db: Session, user_id: str, user_in: UserUpdate, actor_id: str | None = None) -> User:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    actor = _get_actor(db, actor_id)

    if db_user.is_super_admin and actor_id != user_id and (not actor or not actor.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un super admin puede editar a otros super admins."
        )

    if db_user.is_admin and actor_id and actor_id != user_id and (not actor or not actor.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un super admin puede editar a otros administradores."
        )
    
    update_data = user_in.model_dump(exclude_unset=True)

    requested_is_admin = update_data.get("is_admin")
    requested_is_super_admin = update_data.get("is_super_admin")
    admin_flags_changed = (
        ("is_admin" in update_data and requested_is_admin != db_user.is_admin)
        or ("is_super_admin" in update_data and requested_is_super_admin != db_user.is_super_admin)
    )
    if admin_flags_changed and (not actor or not actor.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un super admin puede cambiar permisos de administrador."
        )

    if requested_is_super_admin is True:
        update_data["is_admin"] = True

    if update_data.get("is_admin") is True:
        update_data["role"] = _normalize_admin_role(update_data.get("role") or db_user.role)

    if "time_entry_mode" in update_data:
        update_data["time_entry_mode"] = _normalize_time_entry_mode(update_data.get("time_entry_mode"))

    if "password" in update_data:
        db_user.password_hash = get_password_hash(update_data.pop("password"))

    if "assigned_projects" in update_data:
        projects_data = update_data.pop("assigned_projects")
        if projects_data is not None:
            # Eliminar asignaciones actuales
            from app.models.project_user import ProjectUser
            db.query(ProjectUser).filter(ProjectUser.user_id == user_id).delete()
            # Añadir las nuevas
            for p in projects_data:
                db.add(ProjectUser(user_id=user_id, project_id=p["project_id"], role=p["role"]))

    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.add(db_user)
    log_event(db, actor_id, "User", user_id, "UPDATE", changes=update_data)
    
    db.commit()
    db.refresh(db_user)
    return db_user
