import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import os
import psycopg2
from urllib.parse import urlparse

from app.main import app
from app.database.session import get_db
from app.models import Base
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.project_user import ProjectUser
from app.auth.security import get_password_hash
from datetime import date

# Configuración dinámica para integración con PostgreSQL real
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/timeflow")
parsed = urlparse(DATABASE_URL)

# Derivar URL para conectar a base 'postgres' por defecto y crear base de tests
postgres_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}/postgres"
test_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}/timeflow_test"

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

try:
    # Conectarse a postgres para crear db de test si no existe
    conn = psycopg2.connect(postgres_url)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM pg_database WHERE datname='timeflow_test'")
    if not cursor.fetchone():
        cursor.execute("CREATE DATABASE timeflow_test")
    cursor.close()
    conn.close()
    SQLALCHEMY_DATABASE_URL = test_url
    print("\n--- [TEST SETUP] USANDO POSTGRES REAL (timeflow_test) ---")
except Exception as e:
    print(f"\n--- [TEST SETUP] FALLO CONEXIÓN POSTGRES: Usando SQLite en memoria como Fallback ({e}) ---")
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Configuración de Engine
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Crea una nueva sesión para cada test. Se puede usar un Rollback si queremos
    aislar tests en BD físicas, pero como es en memoria, podemos simplemente
    reusar o borrar. Para mayor seguridad de aislamiento, podemos limpiar tablas.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def seed_tasks(db_session):
    tasks = [
        Task(code="111", name="Gestión Técnica Mecánica", category="Oficina Técnica", requires_extra_fields=False, allowed_roles=["Proyectistas Mecánicos", "Management"]),
        Task(code="115", name="Estudio", category="Oficina Técnica", requires_extra_fields=False, allowed_roles=["Proyectistas Mecánicos", "Management"]),
        Task(code="400", name="Viaje", category="Planta Cliente", requires_extra_fields=True, allowed_roles=["Montadores", "Management"]),
        Task(code="313", name="Montaje y PaP", category="Taller Newval", requires_extra_fields=False, allowed_roles=["Montadores", "Management"]),
    ]
    db_session.add_all(tasks)
    db_session.commit()
    return tasks

@pytest.fixture(scope="function")
def admin_user(db_session):
    user = User(
        employee_code="admin99",
        name="Admin Test",
        password_hash=get_password_hash("admin123"),
        is_admin=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def normal_user(db_session):
    user = User(
        employee_code="user01",
        name="User Test",
        password_hash=get_password_hash("user123"),
        is_admin=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def admin_client(db_session, admin_user):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    c = TestClient(app)
    response = c.post(
        "/auth/login",
        data={"username": admin_user.employee_code, "password": "admin123"}
    )
    token = response.json().get("access_token")
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c

@pytest.fixture(scope="function")
def user_client(db_session, normal_user):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    c = TestClient(app)
    response = c.post(
        "/auth/login",
        data={"username": normal_user.employee_code, "password": "user123"}
    )
    token = response.json().get("access_token")
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c

@pytest.fixture(scope="function")
def seed_projects(db_session):
    projects = [
        Project(code="P-STD", name="Standard Project", distance_from_workshop=10.0, start_date=date(2025, 1, 1), type="standard", is_active=True),
        Project(code="P-OFF", name="Offer Project", distance_from_workshop=0.0, start_date=date(2025, 2, 1), type="offer", is_active=True),
        Project(code="000", name="Non Productive", distance_from_workshop=0.0, start_date=date(2025, 1, 1), type="non-productive", is_active=True),
    ]
    db_session.add_all(projects)
    db_session.commit()
    for p in projects:
        db_session.refresh(p)
    return projects

@pytest.fixture(scope="function")
def assign_project_role(db_session):
    def _assign(project_id: str, user_id: str, role: str):
        assoc = db_session.query(ProjectUser).filter(
            ProjectUser.project_id == project_id,
            ProjectUser.user_id == user_id,
        ).first()
        if assoc:
            assoc.role = role
        else:
            db_session.add(ProjectUser(project_id=project_id, user_id=user_id, role=role))
        db_session.commit()
    return _assign
