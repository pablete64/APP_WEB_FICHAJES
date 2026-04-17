"""
seed_admins.py
==============
Ensures the 4 production admin users always exist (create or update).
Run this FIRST before any other seed so the admins are always available.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.session import SessionLocal
from app.models.user import User
from app.auth.security import get_password_hash

ADMINS = [
    {"code": "GPinol",    "name": "Gemma Pinol",      "pwd": "GP_rk.92#Xp26_!"},
    {"code": "ESoriano",  "name": "Ernesto Soriano",  "pwd": "ES_rk.47*Zs18_?"},
    {"code": "CMartinez", "name": "Cristian Martinez","pwd": "CM_rk.63+Lm99_$"},
    {"code": "PCabaleiro","name": "Pablo Cabaleiro",  "pwd": "PC_rk.15&Vr34_#"},
]

db = SessionLocal()
try:
    print("🔐 Sincronizando administradores de producción...")
    for a in ADMINS:
        user = db.query(User).filter(User.employee_code == a["code"]).first()
        if user:
            user.password_hash = get_password_hash(a["pwd"])
            user.is_admin = True
            user.name = a["name"]
        else:
            user = User(
                employee_code=a["code"],
                name=a["name"],
                password_hash=get_password_hash(a["pwd"]),
                is_admin=True,
                home_location="Sede Central",
            )
            db.add(user)
        print(f"   ✔ {a['code']} — {a['name']}")
    db.commit()
    print("✅ Administradores configurados correctamente.")
except Exception:
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
