import pytest
from app.services import time_entry_service, project_service, user_service
from app.schemas.time_entry import TimeEntryCreate
from app.schemas.user import UserCreate
from datetime import date
from app.models.audit_log import AuditLog

def test_audit_log_time_entry_lifecycle(db_session, admin_user, seed_projects, seed_tasks, assign_project_role):
    project = seed_projects[0]
    task = seed_tasks[3]
    assign_project_role(project.id, admin_user.id, "Management")

    # 1. CREATE
    entry_in = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=date.today(),
        is_holiday=False,
        hours=4,
        overtime_hours=0
    )
    entry = time_entry_service.create_time_entry(db_session, entry_in, admin_user.id)

    audit_logs = db_session.query(AuditLog).filter(AuditLog.entity_id == entry.id).all()
    assert len(audit_logs) == 1
    assert audit_logs[0].action == "CREATE"
    assert audit_logs[0].actor_id == admin_user.id
    assert audit_logs[0].changes["hours"] == 4.0

    # 2. UPDATE
    entry_up = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=date.today(),
        is_holiday=False,
        hours=6,
        overtime_hours=0
    )
    time_entry_service.update_entry(db_session, entry.id, entry_up, actor_id=admin_user.id)

    audit_logs = db_session.query(AuditLog).filter(AuditLog.entity_id == entry.id).order_by(AuditLog.id.desc()).all()
    assert len(audit_logs) == 2
    assert audit_logs[0].action == "UPDATE"
    assert audit_logs[0].changes["new"]["hours"] == 6.0
    assert audit_logs[0].changes["old"]["hours"] == 4.0

    # 3. SOFT_DELETE
    time_entry_service.delete_entry(db_session, entry.id, actor_id=admin_user.id)

    audit_logs = db_session.query(AuditLog).filter(AuditLog.entity_id == entry.id).order_by(AuditLog.id.desc()).all()
    assert len(audit_logs) == 3
    assert audit_logs[0].action == "SOFT_DELETE"

def test_audit_log_user_creation_deletion(db_session, admin_user):
    user_in = UserCreate(employee_code="audit_usr_1", name="Audi Test", is_admin=False, password="password")
    user = user_service.create_user(db_session, user_in, actor_id=admin_user.id)

    logs = db_session.query(AuditLog).filter(AuditLog.entity_id == user.id).all()
    assert len(logs) == 1
    assert logs[0].action == "CREATE"
    assert logs[0].changes["employee_code"] == "audit_usr_1"

    user_service.delete_user(db_session, user.id, actor_id=admin_user.id)
    logs = db_session.query(AuditLog).filter(AuditLog.entity_id == user.id).order_by(AuditLog.id.desc()).all()
    assert len(logs) == 2
    assert logs[0].action == "SOFT_DELETE"
