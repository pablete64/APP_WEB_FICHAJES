import os
import json
from sqlalchemy import TypeDecorator, String
import sqlalchemy.dialects.postgresql

# Force SQLite DB for E2E
os.environ["DATABASE_URL"] = "sqlite:///./e2e_test.db"

class ArrayAsJSON(TypeDecorator):
    impl = String
    cache_ok = True
    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return None
    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
        return None

# Monkeypatch ARRAY to JSON string representation so SQLite doesn't crash
sqlalchemy.dialects.postgresql.ARRAY = lambda x: ArrayAsJSON()

import uvicorn
from app.main import app
from app.database.session import engine, SessionLocal
from app.models import Base
from app.auth.security import get_password_hash
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.project_user import ProjectUser

if __name__ == "__main__":
    # Ensure definitions map to mocked ARRAY schemas
    Base.metadata.create_all(bind=engine)
    
    # Run the payload seeding users
    db = SessionLocal()
    if not db.query(User).filter(User.employee_code == "admin").first():
        db.add(User(
            employee_code="admin",
            name="Administrator",
            password_hash=get_password_hash("admin123"),
            is_admin=True,
        ))
    
    if not db.query(User).filter(User.employee_code == "USER001").first():
        db.add(User(
            employee_code="USER001",
            name="E2E Regular User",
            password_hash=get_password_hash("user123"),
            is_admin=False,
        ))
        
    if not db.query(Task).first():
        db.add_all([
            Task(code="111", name="Gestión Técnica Mecánica", category="Mechanical Engineering", requires_extra_fields=False, allowed_roles=["Proyectistas Mecánicos"]),
            Task(code="115", name="Estudio", category="Mechanical Engineering", requires_extra_fields=False, allowed_roles=["Proyectistas Mecánicos"]),
        ])
        
    from datetime import date
    user1 = db.query(User).filter(User.employee_code == "USER001").first()
    if not db.query(Project).first():
        p = Project(code="PRJ-SEED", name="E2E Base Project", location="Madrid", start_date=date(2025,1,1), type="standard")
        db.add(p)
        db.flush()
        if user1:
            db.add(ProjectUser(project_id=p.id, user_id=user1.id, role="Proyectistas Mecánicos"))
    
    db.commit()
    db.close()
    
    uvicorn.run(app, host="127.0.0.1", port=8000)
