import sys
import os

# Ensure app is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import date, timedelta
from app.database.session import SessionLocal, engine
from app.models import Base
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.project_user import ProjectUser
from app.models.time_entry import TimeEntry
from app.auth.security import get_password_hash
from sqlalchemy.orm import Session
import random

def seed_demo_data():
    # Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    print("Seeding Users...")
    # Admin User
    admin = db.query(User).filter(User.employee_code == "ADMIN").first()
    if not admin:
        admin = User(
            employee_code="ADMIN",
            name="Super Admin",
            password_hash=get_password_hash("admin123"),
            is_admin=True,
            is_super_admin=True,
            home_location="Oficina Central"
        )
        db.add(admin)
        
    # Regular Users
    users = []
    user_roles_by_code = {}
    user_roles = ["PROYECTISTAS MECANICOS", "PROYECTISTAS ELECTRICOS", "PROGRAMADORES", "MONTADORES"]
    for i, role in enumerate(user_roles):
        code = f"USER00{i+1}"
        user_roles_by_code[code] = role
        u = db.query(User).filter(User.employee_code == code).first()
        if not u:
            u = User(
                employee_code=code,
                name=f"Empleado Demo {i+1}",
                password_hash=get_password_hash(f"user00{i+1}"), # ej: user001
                is_admin=False,
                home_location=f"Local {i+1}"
            )
            db.add(u)
        users.append(u)
    
    db.commit()
    
    # Reload users to get ids
    users = db.query(User).filter(User.is_admin == False).all()
        
    print("Seeding Tasks...")
    # Incluimos Management para que el admin también pueda ver tareas comunes
    # Incluimos Management para que el admin también pueda ver tareas comunes
    all_production_roles = ["PROYECTISTAS MECANICOS", "PROYECTISTAS ELECTRICOS", "PROGRAMADORES", "MONTADORES", "Management"]
    
    task_catalog = [
        # --- BLOQUE 100: OFICINA TÉCNICA ---
        ("111", "Gestión Técnica Mecánica", "Oficina Técnica", ["PROYECTISTAS MECANICOS", "Management"]),
        ("112", "Diseño 3D", "Oficina Técnica", ["PROYECTISTAS MECANICOS", "Management"]),
        ("113", "Diseño 2D", "Oficina Técnica", ["PROYECTISTAS MECANICOS", "Management"]),
        ("114", "Documentación Mecánica", "Oficina Técnica", ["PROYECTISTAS MECANICOS", "Management"]),
        ("115", "Estudio ofertas", "Oficina Técnica", ["PROYECTISTAS MECANICOS", "Management"]),
        
        ("121", "Gestión Técnica Eléctrica", "Oficina Técnica", ["PROYECTISTAS ELECTRICOS", "Management"]),
        ("122", "Diseño Elécrico", "Oficina Técnica", ["PROYECTISTAS ELECTRICOS", "Management"]),
        
        ("123", "Programación PLC Off-line", "Oficina Técnica", ["PROGRAMADORES", "Management"]),
        ("124", "Programación Robot OffLine", "Oficina Técnica", ["PROGRAMADORES", "Management"]),
        ("125", "PeM PLC Newval", "Oficina Técnica", ["PROGRAMADORES", "Management"]),
        ("126", "PeM Robot Newval", "Oficina Técnica", ["PROGRAMADORES", "Management"]),
        ("127", "Doc. Eléctrica y Manuales", "Oficina Técnica", ["PROGRAMADORES", "Management"]),

        # --- BLOQUE 200: MATERIALES (Comunes de producción) ---
        ("211", "Comerciales Mecánicos (€)", "Materiales", all_production_roles),
        ("212", "Materia Prima (€)", "Materiales", all_production_roles),
        ("221", "Comerciales Eléctricos (€)", "Materiales", all_production_roles),
        ("222", "Comerciales Fluidos (€)", "Materiales", all_production_roles),

        # --- BLOQUE 300: TALLER NEWVAL ---
        ("311", "Fabricación", "Taller Newval", all_production_roles), # Blanca en tabla = Común
        ("312", "Metrología", "Taller Newval", all_production_roles),  # Blanca en tabla = Común
        ("313", "Montaje y PaP", "Taller Newval", ["MONTADORES", "Management"]),
        ("321", "Armarios y cajas", "Taller Newval", ["MONTADORES", "Management"]),
        ("322", "Montaje e inst. Eléctrica", "Taller Newval", ["MONTADORES", "Management"]),

        # --- BLOQUE 400: PLANTA CLIENTE ---
        ("411", "Montaje y PeM Cliente", "Planta Cliente", ["MONTADORES", "Management"]),
        ("421", "Montaje e Inst. Elec. PeM Cli", "Planta Cliente", ["MONTADORES", "Management"]),
        ("422", "Montaje e Inst. Flu.PeM Client", "Planta Cliente", ["MONTADORES", "Management"]),
        
        ("431", "PeM y Soft Cliente", "Planta Cliente", ["PROGRAMADORES", "Management"]),
        ("432", "PeM Robot Clie", "Planta Cliente", ["PROGRAMADORES", "Management"]),
        ("433", "Formación PeM Cliente", "Planta Cliente", ["PROGRAMADORES", "Management"]),
    ]
    
    for code, name, category, roles in task_catalog:
        t = db.query(Task).filter(Task.code == code).first()
        if not t:
            print(f"Adding task {code}...")
            t = Task(
                code=code,
                name=name,
                category=category,
                requires_extra_fields=code.startswith("4"),
                allowed_roles=roles
            )
            db.add(t)
        else:
            print(f"Updating task {code} allowed_roles...")
            t.allowed_roles = roles
    db.commit()
    
    print("Seeding Projects...")
    tasks = db.query(Task).all()
    
    prj1 = db.query(Project).filter(Project.code == "PRJ-001").first()
    if not prj1:
        prj1 = Project(code="PRJ-001", name="Planta Envasado Madrid", location="Madrid Sur", distance_from_workshop=15.0, start_date=date(2025,1,1), type="standard")
        db.add(prj1)
        db.flush()

        for u in users:
            db.add(ProjectUser(project_id=prj1.id, user_id=u.id, role=user_roles_by_code[u.employee_code]))

    prj2 = db.query(Project).filter(Project.code == "OFR-002").first()
    if not prj2:
        prj2 = Project(code="OFR-002", name="Licitación Línea Ensamblaje Automotriz", location="Zaragoza", start_date=date(2025,2,10), type="offer")
        db.add(prj2)
        
    prj3 = db.query(Project).filter(Project.code == "NON-003").first()
    if not prj3:
        prj3 = Project(code="NON-003", name="I+D Interno (No Productivo)", location="Oficina", start_date=date(2025,1,15), type="non-productive")
        db.add(prj3)

    db.commit()
    
    print("Seeding Time Entries...")
    projects = db.query(Project).all()
    today = date.today()
    
    has_entries = db.query(TimeEntry).first()
    if not has_entries:
        for user in users:
            project_role = user_roles_by_code.get(user.employee_code, "")
            for day_offset in range(10):  # Últimos 10 días
                current_date = today - timedelta(days=day_offset)
                
                # Fines de semana no ficha
                if current_date.weekday() >= 5:
                    continue
                    
                # Proyecto aleatorio (estándar mayoritariamente)
                project = None
                valid_tasks = []
                
                choice = random.random()
                if choice < 0.7:
                    project = prj1
                    valid_tasks = [t for t in tasks if project_role in t.allowed_roles]
                elif choice < 0.9:
                    project = prj3 # no productivo
                    valid_tasks = tasks # no roles req here typically, but let's just pick any task
                else:
                    project = prj2 # oferta
                    valid_tasks = [t for t in tasks if t.code == "115" and project_role in t.allowed_roles]
                
                if not valid_tasks:
                   continue
                   
                task = random.choice(valid_tasks)
                
                hours = random.randint(6, 8)
                overtime = random.randint(0, 2) if hours == 8 else 0
                
                entry = TimeEntry(
                    user_id=user.id,
                    project_id=project.id,
                    task_id=task.id,
                    date=current_date,
                    hours=hours,
                    overtime_hours=overtime,
                    is_holiday=False
                )
                
                if getattr(task, "requires_extra_fields", False):
                    entry.vehicle_type = "Furgoneta A"
                    entry.meals = True
                    entry.distance_origin = "Taller Central"
                    
                db.add(entry)
                
        db.commit()

    print("=========================================")
    print("DATO SEMILLA GENERADO CORRECTAMENTE.")
    print("Usuarios demo creados:")
    print(" - Admin: ADMIN / admin123")
    print(" - Empleado 1 (Proy. Mecánico): USER001 / user001")
    print(" - Empleado 2 (Proy. Eléctrico): USER002 / user002")
    print(" - Empleado 3 (Programador): USER003 / user003")
    print(" - Empleado 4 (Montador): USER004 / user004")
    print("=========================================")

if __name__ == "__main__":
    seed_demo_data()
