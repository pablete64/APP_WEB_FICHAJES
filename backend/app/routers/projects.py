from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.user import UserResponse
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/me", response_model=List[ProjectResponse])
def get_my_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Devuelve los proyectos asignados al usuario autenticado actual."""
    return project_service.list_projects_for_user(db, current_user.id)


@router.get("/", response_model=List[ProjectResponse])
def list_all_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Lista el catálogo de proyectos completo (Solo Admin)"""
    return project_service.list_projects(db, skip, limit)


@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Crea un proyecto. Solo administradores."""
    return project_service.create_project(db, project)
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Actualiza un proyecto y sus asignaciones. Admin solo."""
    return project_service.update_project(db, project_id, project.model_dump(exclude_unset=True))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Detalle de un proyecto"""
    project = project_service.get_project_by_id(db, project_id)
    if not project:
         from fastapi import HTTPException
         raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Elimina el proyecto íntegro (Admin solo)"""
    project_service.delete_project(db, project_id)
    return None

# ================= ASIGNACIONES =====================

@router.get("/{project_id}/users", response_model=List[UserResponse])
def get_assigned_users(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Obtener los usuarios de un proyecto"""
    return project_service.get_users_for_project(db, project_id)


@router.post("/{project_id}/assign-user/{user_id}", status_code=204)
def assign_user(project_id: str, user_id: str, role: str | None = Query(None), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Relaciona un usuario específico al proyecto."""
    project_service.assign_user_to_project(db, project_id, user_id, role)
    return None

@router.delete("/{project_id}/assign-user/{user_id}", status_code=204)
def unassign_user(project_id: str, user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Desvincula un usuario del proyecto"""
    project_service.unassign_user_from_project(db, project_id, user_id)
    return None
