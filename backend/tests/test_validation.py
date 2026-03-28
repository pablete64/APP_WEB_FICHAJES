import pytest
from app.services import time_entry_service, project_service
from app.schemas.time_entry import TimeEntryCreate
from datetime import date, timedelta
from fastapi import HTTPException

def test_task_allowed_roles_validation(db_session, normal_user, seed_projects, seed_tasks):
    # normal_user role: "Assemblers"
    project = seed_projects[0]
    task = seed_tasks[0]  # This has allowed_roles=[] (Empty means allowed for everyone? or none? In our logic if task.allowed_roles it triggers the inner check.)
    
    # 📝 Modify task to restrict roles
    task.allowed_roles = ["Proyectistas Mecánicos"] # normal_user is 'Assemblers'
    db_session.add(task)
    db_session.commit()

    project_service.assign_user_to_project(db_session, project.id, normal_user.id)

    entry_in = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=date.today(),
        is_holiday=False,
        hours=4,
        overtime_hours=0
    )

    with pytest.raises(HTTPException) as exc_info:
        time_entry_service.create_time_entry(db_session, entry_in, normal_user.id)
    
    assert exc_info.value.status_code == 403
    assert "not allowed for task" in str(exc_info.value.detail)

def test_update_entry_validation_triggers(db_session, admin_user, normal_user, seed_projects, seed_tasks):
    # Create valid entry first
    project = seed_projects[0]
    task = seed_tasks[3]
    project_service.assign_user_to_project(db_session, project.id, normal_user.id)
    
    entry_in = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=date.today(),
        is_holiday=False,
        hours=4,
        overtime_hours=0
    )
    entry = time_entry_service.create_time_entry(db_session, entry_in, normal_user.id)

    # 🛑 Now try to update it into a FUTURE date (invalid rule)
    tomorrow = date.today() + timedelta(days=1)
    bad_update = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=tomorrow, # Invalid
        is_holiday=False,
        hours=4,
        overtime_hours=0
    )

    with pytest.raises(HTTPException) as exc_info:
        # update_entry internally assumes is_admin=True from router context
        time_entry_service.update_entry(db_session, entry.id, bad_update)
    
    assert exc_info.value.status_code == 400
    assert "Cannot register hours for a future date" in str(exc_info.value.detail)
