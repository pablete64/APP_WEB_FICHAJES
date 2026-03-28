import sys
import os
import random
from datetime import date, timedelta
from passlib.context import CryptContext

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.session import SessionLocal, engine
from app.models import Base
from app.models.task import Task
from app.models.user import User
from app.models.project import Project
from app.models.time_entry import TimeEntry

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_random_home_location():
    locations = [
        "Carrer de Balmes 12, Barcelona",
        "Gran Via de les Corts Catalanes 55, Barcelona",
        "Avinguda Meridiana 100, Barcelona",
        "Carrer de Sants 23, Barcelona",
        "Ronda del Litoral 90, Barcelona"
    ]
    return random.choice(locations)

db = SessionLocal()

try:
    print("Updating schema...")
    Base.metadata.create_all(bind=engine)
    
    print("WARNING: Wiping all database records except Tasks and Admin user...")
    
    # Delete all Time Entries
    db.query(TimeEntry).delete()
    
    # Delete all Projects
    db.query(Project).delete()
    
    # Delete all Users except admin
    db.query(User).filter(User.is_admin == False).delete()
    
    db.commit()
    print("Database wiped successfully.")
    
    
    print("Creating Project 3025 - MANGO...")
    mango_project = Project(
        code="3025",
        name="MANGO",
        location="Avenida Can Montcau, 6, 08186 Lliçà d'Amunt, Barcelona",
        distance_from_workshop=45.5, 
        start_date=date(2026, 3, 1),
        type="standard",
        is_active=True
    )
    db.add(mango_project)
    db.flush() # get ID
    
    print("Creating 8 new Employees...")
    emp_data = [
        {"name": "Antonio Merino", "role": "Proyectistas Mecánicos"},
        {"name": "Gemma", "role": "Proyectistas Eléctricos"},
        {"name": "Antonio Silva", "role": "Programadores"},
        {"name": "Ernesto Soriano", "role": "Proyectistas Mecánicos"},
        {"name": "Kevin Soriano", "role": "Proyectistas Eléctricos"},
        {"name": "Pablo Cabaleiro", "role": "Programadores"},
        {"name": "CATHAYSA", "role": "Montadores"},
        {"name": "Arnau", "role": "Montadores"},
    ]
    
    new_users = []
    base_code = 1001
    for data in emp_data:
        new_u = User(
            employee_code=str(base_code),
            name=data["name"],
            home_location=get_random_home_location(),
            role=data["role"],
            password_hash=get_password_hash("1234") # Default password
        )
        db.add(new_u)
        new_users.append(new_u)
        base_code += 1
        
    db.flush()
    
    print("Assigning all users to project MANGO...")
    for user in new_users:
        if user not in mango_project.users:
            mango_project.users.append(user)
            
    db.commit()
    
    print("Seeding 1920 normal hours and 30 overtime hours across March 2026...")
    total_hours_target = 1920
    current_hours = 0
    total_overtime_target = 30
    current_overtime = 0
    
    start_date = date(2026, 3, 1)
    # March 2026 has 31 days
    days_in_mar = [start_date + timedelta(days=i) for i in range(31)]
    
    # Only pick weekdays for realism
    weekdays = [d for d in days_in_mar if d.weekday() < 5]
    
    tasks_cache = db.query(Task).all()
    tasks_by_role = {}
    for r in ["Proyectistas Mecánicos", "Proyectistas Eléctricos", "Programadores", "Montadores"]:
        # Case-insensitive matching as fallback, though now it matches exactly
        tasks_by_role[r] = [t for t in tasks_cache if r.lower() in [role.lower() for role in t.allowed_roles]]
        
    while current_hours < total_hours_target or current_overtime < total_overtime_target:
        # Pick a random user
        user = random.choice(new_users)
        r_tasks = tasks_by_role[user.role]
        
        if not r_tasks:
            continue # safety fallback
            
        task = random.choice(r_tasks)
        day = random.choice(weekdays)
        
        hours_worked = float(random.choice([4.0, 8.0, 2.0]))
        
        if current_hours + hours_worked > total_hours_target:
            hours_worked = total_hours_target - current_hours
            
        overtime_worked = 0.0
        if current_overtime < total_overtime_target:
            if random.random() > 0.7: # 30% chance of doing overtime on a given ticket
                overtime_worked = float(random.choice([1.0, 2.0]))
                if current_overtime + overtime_worked > total_overtime_target:
                    overtime_worked = total_overtime_target - current_overtime
                current_overtime += overtime_worked
            
        entry = TimeEntry(
            user_id=user.id,
            project_id=mango_project.id,
            task_id=task.id,
            date=day,
            hours=hours_worked,
            overtime_hours=overtime_worked,
            is_holiday=False
        )
        
        # Fill in client plant fields if it's a 4XX task randomly
        if task.code.startswith("4"):
            origin = random.choice(["home", "workshop"])
            entry.distance_origin = origin
            
            if origin == "home":
                entry.vehicle_type = "personal" # Mandatory
            else:
                entry.vehicle_type = random.choice(["personal", "company"])
                
            entry.meals = random.choice([True, False])
            entry.trip_type = random.choice(["to", "from", "round"])
            
        db.add(entry)
        current_hours += hours_worked
        
    db.commit()
    print(f"Seed complete! Generated {current_hours} normal hours and {current_overtime} overtime hours in March 2026.")

except Exception as e:
    db.rollback()
    print("Error during wipe & seed:")
    import traceback
    traceback.print_exc()
finally:
    db.close()
