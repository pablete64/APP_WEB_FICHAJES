import pytest
from app.services import user_service, time_entry_service, project_service
from app.schemas.user import UserCreate
from app.schemas.project import ProjectCreate
from app.schemas.time_entry import TimeEntryCreate
from datetime import date

def test_user_soft_delete(db_session):
    # 1. Create a user
    user_in = UserCreate(employee_code="soft_user_test", name="Soft Test", role="Programadores", is_admin=False, password="password")
    user = user_service.create_user(db_session, user_in)
    
    users = user_service.list_users(db_session)
    assert user in users

    # 2. Soft delete the user
    user_service.delete_user(db_session, user.id)
    
    # 3. Verify deleted_at is updated (Audit trail)
    db_session.refresh(user)
    assert user.deleted_at is not None

    # 4. Verify it's omitted list queries
    users_post = user_service.list_users(db_session)
    assert user not in users_post

def test_time_entry_soft_delete(db_session, normal_user, seed_projects, seed_tasks):
    project = seed_projects[0]
    task = seed_tasks[3]

    # Assign user to project since create_time_entry validates assignments
    project_service.assign_user_to_project(db_session, project.id, normal_user.id)

    # 1. Create a time entry
    entry_in = TimeEntryCreate(
        project_id=project.id,
        task_id=task.id,
        date=date.today(),
        is_holiday=False,
        hours=4,
        overtime_hours=0
    )
    entry = time_entry_service.create_time_entry(db_session, entry_in, normal_user.id)
    
    entries = time_entry_service.get_user_time_entries(db_session, normal_user.id)
    assert entry in entries

    # 2. Soft delete
    time_entry_service.delete_entry(db_session, entry.id)

    db_session.refresh(entry)
    assert entry.deleted_at is not None # Audit trail

    # 3. Verify it's omitted
    entries_post = time_entry_service.get_user_time_entries(db_session, normal_user.id)
    assert entry not in entries_post
