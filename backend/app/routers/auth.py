from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database.session import get_db
from app.schemas.auth import Token, LoginResponse
from app.auth.security import verify_password, create_access_token
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=LoginResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login con employee_code (en el campo username) y password para obtener token JWT.
    """
    user = db.query(User).filter(User.employee_code == form_data.username, User.deleted_at == None).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect employee code or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(subject=user.employee_code)
    return {"access_token": access_token, "token_type": "bearer", "user": user}
