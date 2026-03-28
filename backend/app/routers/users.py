from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service
from app.auth.dependencies import require_admin

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Lista todos los usuarios. (Requiere permisos de Admin)"""
    return user_service.list_users(db, skip=skip, limit=limit)

@router.post("/", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Crea un usuario nuevo. (Requiere permisos de Admin)"""
    return user_service.create_user(db=db, user_in=user, actor_id=current_user.id)

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Elimina un usuario por su ID. (Requiere permisos de Admin)"""
    user_service.delete_user(db, user_id=user_id, actor_id=current_user.id)
    return None
