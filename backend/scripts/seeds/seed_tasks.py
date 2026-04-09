import os
import sys

# Añadir el directorio raíz al path para poder importar 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.session import SessionLocal
from app.services.task_service import seed_default_tasks
from app.models.task import Task

def main():
    db = SessionLocal()
    try:
        print("🌱 Sincronizando catálogo de tareas oficiales...")
        from app.models.task import Task
        
        all_production_roles = ["PROYECTISTAS MECANICOS", "PROYECTISTAS ELECTRICOS", "PROGRAMADORES", "MONTADORES", "Management"]
        task_catalog = [
            {"code": "111", "name": "Gestión Técnica Mecánica", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS MECANICOS", "Management"], "requires_extra_fields": False},
            {"code": "112", "name": "Diseño 3D", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS MECANICOS", "Management"], "requires_extra_fields": False},
            {"code": "113", "name": "Diseño 2D", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS MECANICOS", "Management"], "requires_extra_fields": False},
            {"code": "114", "name": "Documentación Mecánica", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS MECANICOS", "Management"], "requires_extra_fields": False},
            {"code": "115", "name": "Estudio ofertas", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS MECANICOS", "Management"], "requires_extra_fields": False},
            {"code": "121", "name": "Gestión Técnica Eléctrica", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS ELECTRICOS", "Management"], "requires_extra_fields": False},
            {"code": "122", "name": "Diseño Elécrico", "category": "Oficina Técnica", "allowed_roles": ["PROYECTISTAS ELECTRICOS", "Management"], "requires_extra_fields": False},
            {"code": "123", "name": "Programación PLC Off-line", "category": "Oficina Técnica", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": False},
            {"code": "124", "name": "Programación Robot OffLine", "category": "Oficina Técnica", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": False},
            {"code": "125", "name": "PeM PLC Newval", "category": "Oficina Técnica", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": False},
            {"code": "126", "name": "PeM Robot Newval", "category": "Oficina Técnica", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": False},
            {"code": "127", "name": "Doc. Eléctrica y Manuales", "category": "Oficina Técnica", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": False},
            {"code": "211", "name": "Comerciales Mecánicos (€)", "category": "Materiales", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "212", "name": "Materia Prima (€)", "category": "Materiales", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "221", "name": "Comerciales Eléctricos (€)", "category": "Materiales", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "222", "name": "Comerciales Fluidos (€)", "category": "Materiales", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "311", "name": "Fabricación", "category": "Taller Newval", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "312", "name": "Metrología", "category": "Taller Newval", "allowed_roles": all_production_roles, "requires_extra_fields": False},
            {"code": "313", "name": "Montaje y PaP", "category": "Taller Newval", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": False},
            {"code": "321", "name": "Armarios y cajas", "category": "Taller Newval", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": False},
            {"code": "322", "name": "Montaje e inst. Eléctrica", "category": "Taller Newval", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": False},
            {"code": "411", "name": "Montaje y PeM Cliente", "category": "Planta Cliente", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": True},
            {"code": "421", "name": "Montaje e Inst. Elec. PeM Cli", "category": "Planta Cliente", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": True},
            {"code": "422", "name": "Montaje e Inst. Flu.PeM Client", "category": "Planta Cliente", "allowed_roles": ["MONTADORES", "Management"], "requires_extra_fields": True},
            {"code": "431", "name": "PeM y Soft Cliente", "category": "Planta Cliente", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": True},
            {"code": "432", "name": "PeM Robot Clie", "category": "Planta Cliente", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": True},
            {"code": "433", "name": "Formación PeM Cliente", "category": "Planta Cliente", "allowed_roles": ["PROGRAMADORES", "Management"], "requires_extra_fields": True},
        ]

        for t_data in task_catalog:
            db_task = db.query(Task).filter(Task.code == t_data["code"]).first()
            if db_task:
                for key, value in t_data.items():
                    setattr(db_task, key, value)
            else:
                db.add(Task(**t_data))
        
        db.commit()
        print("✅ Catálogo de tareas sincronizado correctamente.")
    except Exception as e:
        print(f"❌ Error al cargar tareas: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
