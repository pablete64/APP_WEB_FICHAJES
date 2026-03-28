from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_event(db: Session, actor_id: str | None, entity_type: str, entity_id: str, action: str, changes: dict | None = None):
    """
    Registra un evento de auditoría.
    Se añade al Session para ser persistido junto con la transacción contenedora.
    """
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        changes=changes
    )
    db.add(log)
    return log
