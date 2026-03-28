from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List

from app.models.project import Project
from app.models.project_user import project_user_table
from app.models.user import User
from app.schemas.project import ProjectCreate

def get_project_by_id(db: Session, project_id: str) -> Project | None:
    return db.query(Project).filter(Project.id == project_id, Project.deleted_at == None).first()

def get_project_by_code(db: Session, code: str) -> Project | None:
    return db.query(Project).filter(Project.code == code, Project.deleted_at == None).first()

def create_project(db: Session, project_in: ProjectCreate) -> Project:
    if get_project_by_code(db, code=project_in.code):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project code already exists"
        )
    
    # Validar Enum de tipo
    allowed_types = ["standard", "offer", "non-productive"]
    if project_in.type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project type must be one of: {allowed_types}"
        )

    # Buscar usuarios para adjuntar
    assigned_users = []
    if project_in.assigned_user_ids:
        assigned_users = db.query(User).filter(User.id.in_(project_in.assigned_user_ids)).all()
        # Verificar si mandó IDs que no existen
        if len(assigned_users) != len(project_in.assigned_user_ids):
            raise HTTPException(
                 status_code=status.HTTP_404_NOT_FOUND,
                 detail="One or more assigned user IDs do not exist"
            )

    db_project = Project(
        name=project_in.name,
        code=project_in.code,
        location=project_in.location,
        distance_from_workshop=project_in.distance_from_workshop,
        start_date=project_in.start_date,
        type=project_in.type,
        users=assigned_users
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: str):
    project = get_project_by_id(db, project_id)
    if getattr(project, "type", None) == "non-productive" and project.code == "000":
         raise HTTPException(status_code=403, detail="Cannot delete the default non-productive project")
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.deleted_at = func.now()
    db.add(project)
    db.commit()
    return True

def list_projects(db: Session, skip: int = 0, limit: int = 100) -> List[Project]:
    return db.query(Project).filter(Project.deleted_at == None).offset(skip).limit(limit).all()

def list_projects_for_user(db: Session, user_id: str) -> List[Project]:
    return db.query(Project).filter(
        (Project.users.any(User.id == user_id) | (Project.type == 'non-productive')),
        Project.deleted_at == None
    ).all()

def assign_user_to_project(db: Session, project_id: str, user_id: str):
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")
         
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    if user in project.users:
        raise HTTPException(status_code=409, detail="User is already assigned to this project")

    project.users.append(user)
    db.commit()
    return True

def unassign_user_from_project(db: Session, project_id: str, user_id: str):
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")

    user = next((u for u in project.users if u.id == user_id), None)
    if not user:
         raise HTTPException(status_code=404, detail="User is not assigned to this project")

    project.users.remove(user)
    db.commit()
    return True

def get_users_for_project(db: Session, project_id: str) -> List[User]:
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")
    return project.users
