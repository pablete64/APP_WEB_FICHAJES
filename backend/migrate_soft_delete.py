from sqlalchemy import text
from app.database.session import engine

def migrate_soft_delete():
    print("Iniciando migración para Soft Delete...")
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;"
    ]
    
    with engine.connect() as connection:
        for stmt in statements:
            try:
                connection.execute(text(stmt))
                connection.commit()
                print(f"Éxito: {stmt}")
            except Exception as e:
                # Absorber errores si if not exists no se soporta o ya existía
                print(f"Informativo: No se pudo ejecutar '{stmt}' (Posiblemente ya existía). Detalle: {e}")

if __name__ == "__main__":
    migrate_soft_delete()
