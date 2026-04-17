"""
Seed: Segundo proyecto "PRJ-002 — Automatización Planta Valencia"
con entradas de tiempo aleatorias para todo marzo 2026.

Ejecutar desde la carpeta backend/:
  python seed_project2_march.py
"""
import sys
import os
import random
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal, engine
from app.models import Base
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.project_user import ProjectUser
from app.models.time_entry import TimeEntry
from sqlalchemy.orm import Session

# ── Configuración del proyecto ──────────────────────────────────────────────
PROJECT_CODE     = "PRJ-002"
PROJECT_NAME     = "Automatización Planta Valencia"
PROJECT_LOCATION = "Valencia Industrial"
DISTANCE_KM      = 22.5       # km desde la nave hasta el cliente
PROJECT_TYPE     = "standard"
PROJECT_START    = date(2026, 1, 15)

# Marzo 2026
YEAR  = 2026
MONTH = 3

# Distribución de tareas por rol (igual que el catálogo real)
TASK_MAP = {
    "Proyectistas Mecánicos":  ["111", "112", "113", "114"],
    "Proyectistas Eléctricos": ["121", "122"],
    "Programadores":           ["123", "124", "125", "126", "127", "431", "432", "433"],
    "Montadores":              ["313", "321", "322", "411", "421", "422"],
}

# Probabilidad de que un día dado sea de planta cliente (tarea 4XX)
P_CLIENT_TASK = 0.35

def get_march_workdays():
    days = []
    d = date(YEAR, MONTH, 1)
    while d.month == MONTH:
        if d.weekday() < 5:   # lun-vie
            days.append(d)
        d += timedelta(days=1)
    return days


def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # ── Usuarios ──────────────────────────────────────────────────────────────
    users = db.query(User).filter(User.is_admin == False).all()
    if not users:
        print("ERROR: No hay usuarios en la BD. Ejecuta seed_demo.py primero.")
        db.close()
        return

    # ── Tareas ────────────────────────────────────────────────────────────────
    tasks = db.query(Task).all()
    task_by_code = {t.code: t for t in tasks}

    # ── Proyecto ──────────────────────────────────────────────────────────────
    prj = db.query(Project).filter(Project.code == PROJECT_CODE).first()
    if not prj:
        prj = Project(
            code=PROJECT_CODE,
            name=PROJECT_NAME,
            location=PROJECT_LOCATION,
            distance_from_workshop=DISTANCE_KM,
            start_date=PROJECT_START,
            type=PROJECT_TYPE,
            is_active=True,
        )
        db.add(prj)
        db.flush()   # get prj.id
        print(f"  Proyecto creado: [{PROJECT_CODE}] {PROJECT_NAME}")
    else:
        print(f"  Proyecto ya existe: [{PROJECT_CODE}] {PROJECT_NAME}")

    user_roles = {}
    for u in users:
        existing_assoc = next((assoc for assoc in u.project_associations if assoc.role), None)
        if existing_assoc:
            user_roles[u.id] = existing_assoc.role

    # Asignar todos los usuarios al proyecto
    for u in users:
        project_role = user_roles.get(u.id)
        if not project_role:
            print(f"  AVISO: usuario '{u.employee_code}' sin rol por proyecto, saltando asignacion.")
            continue
        if u not in prj.users:
            db.add(ProjectUser(project_id=prj.id, user_id=u.id, role=project_role))

    db.commit()

    # ── Entradas de tiempo ────────────────────────────────────────────────────
    march_days = get_march_workdays()
    created = 0

    for u in users:
        project_role = user_roles.get(u.id)
        if not project_role:
            continue

        role_tasks_codes = TASK_MAP.get(project_role, [])
        if not role_tasks_codes:
            print(f"  AVISO: rol '{project_role}' no tiene tareas mapeadas, saltando.")
            continue

        # Calcular qué días trabaja este usuario en PRJ-002
        # (mezcla realista: 60-80 % de los días laborables del mes en este proyecto)
        p_work = random.uniform(0.60, 0.80)
        working_days = [d for d in march_days if random.random() < p_work]

        for day in working_days:
            # ¿Ya existe una entrada para este usuario/proyecto/día?
            existing = db.query(TimeEntry).filter(
                TimeEntry.user_id   == u.id,
                TimeEntry.project_id == prj.id,
                TimeEntry.date       == day,
            ).first()
            if existing:
                continue

            # Elegir tarea
            use_client_task = (
                random.random() < P_CLIENT_TASK
                and any(c.startswith("4") for c in role_tasks_codes)
            )
            if use_client_task:
                codes = [c for c in role_tasks_codes if c.startswith("4")]
            else:
                codes = [c for c in role_tasks_codes if not c.startswith("4")]
            if not codes:
                codes = role_tasks_codes

            code = random.choice(codes)
            task = task_by_code.get(code)
            if not task:
                continue

            # Horas
            hrs      = random.choice([6, 7, 8, 8, 8, 9])
            overtime = random.randint(0, 2) if hrs >= 8 else 0

            entry = TimeEntry(
                user_id    = u.id,
                project_id = prj.id,
                task_id    = task.id,
                date       = day,
                hours      = hrs,
                overtime_hours = overtime,
                is_holiday = False,
            )

            # Campos extra para tareas 4XX (planta cliente)
            if task.requires_extra_fields:
                origin   = random.choice(["CASA", "NAVE"])
                trip     = random.choice(["round", "to", "from", "round"])  # más round trips
                vehicle  = "particular" if origin == "CASA" else random.choice(["particular", "empresa"])
                entry.distance_origin = origin
                entry.trip_type       = trip
                entry.vehicle_type    = vehicle
                entry.meals           = random.random() < 0.70   # 70 % de los días con dieta

            db.add(entry)
            created += 1

    db.commit()
    db.close()

    print(f"\n✓ Seed completado.")
    print(f"  Proyecto : [{PROJECT_CODE}] {PROJECT_NAME}")
    print(f"  Distancia: {DISTANCE_KM} km")
    print(f"  Usuarios : {len(users)}")
    print(f"  Entradas : {created} nuevas entradas de marzo {YEAR}")


if __name__ == "__main__":
    seed()
