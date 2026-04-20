from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List
from app.models.time_entry import TimeEntry

from app.models.project import Project
from app.models.project_user import ProjectUser
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
    assigned_user_ids = [u.user_id for u in project_in.assigned_users]
    if assigned_user_ids:
        found_users = db.query(User).filter(User.id.in_(assigned_user_ids)).all()
        # Verificar si mandó IDs que no existen
        if len(found_users) != len(assigned_user_ids):
            raise HTTPException(
                 status_code=status.HTTP_404_NOT_FOUND,
                 detail="One or more assigned user IDs do not exist"
            )

    db_project = Project(
        name=project_in.name,
        code=project_in.code,
        location=project_in.location,
        distance_from_workshop=project_in.distance_from_workshop,
        travel_time=(project_in.travel_time or 0) * 2, # x2 para ida+vuelta
        km_rate=project_in.km_rate,
        daily_allowance_rate=project_in.daily_allowance_rate,
        start_date=project_in.start_date,
        type=project_in.type
    )

    db.add(db_project)
    db.flush()

    for mapping in project_in.assigned_users:
        assoc = ProjectUser(project_id=db_project.id, user_id=mapping.user_id, role=mapping.role)
        db.add(assoc)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: str):
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if getattr(project, "type", None) == "non-productive" and project.code == "000":
        raise HTTPException(status_code=403, detail="Cannot delete the default non-productive project")

    now = func.now()

    # 1. Soft-delete all time entries for this project
    db.query(TimeEntry)\
      .filter(TimeEntry.project_id == project_id, TimeEntry.deleted_at == None)\
      .update({"deleted_at": now}, synchronize_session=False)

    # 2. Hard-delete all project-user assignments (users themselves are untouched)
    db.query(ProjectUser)\
      .filter(ProjectUser.project_id == project_id)\
      .delete(synchronize_session=False)

    # 3. Soft-delete the project itself
    project.deleted_at = now
    db.add(project)
    db.commit()
    return True

def list_projects(db: Session, skip: int = 0, limit: int = 100) -> List[Project]:
    return db.query(Project).filter(Project.deleted_at == None).offset(skip).limit(limit).all()

def list_projects_for_user(db: Session, user_id: str) -> List[Project]:
    return db.query(Project).filter(
        (Project.user_associations.any(ProjectUser.user_id == user_id) | (Project.type == 'non-productive')),
        Project.deleted_at == None
    ).all()

def assign_user_to_project(db: Session, project_id: str, user_id: str, role: str | None = None):
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")
         
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    # Find existing mapping
    existing = db.query(ProjectUser).filter_by(project_id=project_id, user_id=user_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already assigned to this project")

    effective_role = role or user.role
    if not effective_role:
        raise HTTPException(status_code=400, detail="A project role is required to assign the user")

    assoc = ProjectUser(project_id=project_id, user_id=user_id, role=effective_role)
    db.add(assoc)
    db.commit()
    return True

def unassign_user_from_project(db: Session, project_id: str, user_id: str):
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")

    assoc = db.query(ProjectUser).filter_by(project_id=project_id, user_id=user_id).first()
    if not assoc:
         raise HTTPException(status_code=404, detail="User is not assigned to this project")

    db.delete(assoc)
    db.commit()
    return True

def update_project(db: Session, project_id: str, project_in: dict) -> Project:
    db_project = get_project_by_id(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if "code" in project_in and project_in["code"] != db_project.code:
        if get_project_by_code(db, code=project_in["code"]):
            raise HTTPException(status_code=409, detail="Project code already exists")

    if "type" in project_in:
        allowed_types = ["standard", "offer", "non-productive"]
        if project_in["type"] not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Project type must be: {allowed_types}")

    assigned_users = project_in.pop("assigned_users", None)
    
    # Update project fields
    if "travel_time" in project_in:
        project_in["travel_time"] = (project_in["travel_time"] or 0) * 2

    for field, value in project_in.items():
        setattr(db_project, field, value)
        
    if assigned_users is not None:
        # Sync assignments
        db.query(ProjectUser).filter(ProjectUser.project_id == project_id).delete()
        for mapping in assigned_users:
            assoc = ProjectUser(project_id=project_id, user_id=mapping["user_id"], role=mapping["role"])
            db.add(assoc)

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_users_for_project(db: Session, project_id: str) -> List[User]:
    project = get_project_by_id(db, project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")
    return project.users
