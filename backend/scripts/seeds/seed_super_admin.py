"""
seed_super_admin.py
===================
Creates or updates a dedicated super admin user without modifying existing admins.
Intended to bootstrap the first super admin safely in production.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.auth.security import get_password_hash
from app.database.session import SessionLocal
from app.models.user import User


SUPER_ADMIN_CODE = os.getenv("SUPER_ADMIN_CODE", "SUPERADMIN")
SUPER_ADMIN_NAME = os.getenv("SUPER_ADMIN_NAME", "Super Admin")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "change-me-now")
SUPER_ADMIN_HOME = os.getenv("SUPER_ADMIN_HOME_LOCATION", "Sede Central")


db = SessionLocal()
try:
    print("🔐 Sincronizando super admin dedicado...")
    user = db.query(User).filter(User.employee_code == SUPER_ADMIN_CODE).first()
    if user:
        user.name = SUPER_ADMIN_NAME
        user.password_hash = get_password_hash(SUPER_ADMIN_PASSWORD)
        user.is_admin = True
        user.is_super_admin = True
        user.home_location = SUPER_ADMIN_HOME
        print(f"   ✔ Actualizado {SUPER_ADMIN_CODE}")
    else:
        user = User(
            employee_code=SUPER_ADMIN_CODE,
            name=SUPER_ADMIN_NAME,
            password_hash=get_password_hash(SUPER_ADMIN_PASSWORD),
            is_admin=True,
            is_super_admin=True,
            home_location=SUPER_ADMIN_HOME,
            role="MANAGEMENT",
        )
        db.add(user)
        print(f"   ✔ Creado {SUPER_ADMIN_CODE}")
    db.commit()
    print("✅ Super admin preparado correctamente.")
except Exception:
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
