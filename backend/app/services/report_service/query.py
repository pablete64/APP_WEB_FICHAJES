from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date

from app.models.time_entry import TimeEntry
from app.models.project import Project
from app.models.user import User
from app.models.task import Task
from app.schemas.report import (
    ProjectReportResponse,
    UserReportResponse,
    TaskReportResponse,
    DailyReportResponse
)

def apply_filters(query, start_date: Optional[date] = None, end_date: Optional[date] = None, 
                  project_id: Optional[str] = None, user_id: Optional[str] = None, task_code: Optional[str] = None):
    """Aplica de manera programática los filtros comunes a las consultas de TimeEntry."""
    # Filtrar siempre elementos no borrados
    query = query.filter(TimeEntry.deleted_at == None)
    
    if start_date:
        query = query.filter(TimeEntry.date >= start_date)
    if end_date:
        query = query.filter(TimeEntry.date <= end_date)
    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)
    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)
    if task_code:
        query = query.outerjoin(Task, TimeEntry.task_id == Task.id).filter(Task.code == task_code)
    return query

def get_hours_by_project(db: Session, **filters) -> List[ProjectReportResponse]:
    is_sqlite = db.bind.dialect.name == 'sqlite'
    date_expr = func.strftime('%Y-%m', TimeEntry.date) if is_sqlite else func.to_char(TimeEntry.date, 'YYYY-MM')
    
    query = db.query(
        date_expr.label("year_month"),
        Project.id.label("project_id"),
        Project.name.label("project_name"),
        func.sum(func.coalesce(TimeEntry.hours, 0)).label("total_hours"),
        func.sum(func.coalesce(TimeEntry.overtime_hours, 0)).label("total_overtime")
    ).outerjoin(Project, TimeEntry.project_id == Project.id)
    
    query = apply_filters(query, **filters)
    
    result = query.group_by(
        date_expr, Project.id, Project.name
    ).order_by(date_expr.desc()).all()
    return result

def get_hours_by_user(db: Session, **filters) -> List[UserReportResponse]:
    is_sqlite = db.bind.dialect.name == 'sqlite'
    date_expr = func.strftime('%Y-%m', TimeEntry.date) if is_sqlite else func.to_char(TimeEntry.date, 'YYYY-MM')
    
    query = db.query(
        date_expr.label("year_month"),
        User.id.label("user_id"),
        User.employee_code.label("employee_code"),
        User.name.label("name"),
        func.sum(func.coalesce(TimeEntry.hours, 0)).label("total_hours"),
        func.sum(func.coalesce(TimeEntry.overtime_hours, 0)).label("total_overtime")
    ).outerjoin(User, TimeEntry.user_id == User.id)
    
    query = apply_filters(query, **filters)
    result = query.group_by(
        date_expr, User.id, User.employee_code, User.name
    ).order_by(date_expr.desc()).all()
    return result

def get_hours_by_task(db: Session, **filters) -> List[TaskReportResponse]:
    is_sqlite = db.bind.dialect.name == 'sqlite'
    date_expr = func.strftime('%Y-%m', TimeEntry.date) if is_sqlite else func.to_char(TimeEntry.date, 'YYYY-MM')
    
    query = db.query(
        date_expr.label("year_month"),
        Task.code.label("task_code"),
        Task.name.label("task_name"),
        func.sum(func.coalesce(TimeEntry.hours, 0)).label("total_hours")
    ).outerjoin(Task, TimeEntry.task_id == Task.id)
    
    query = apply_filters(query, **filters)
    result = query.group_by(
        date_expr, Task.code, Task.name
    ).order_by(date_expr.desc()).all()
    return result

def get_hours_by_day(db: Session, **filters) -> List[DailyReportResponse]:
    query = db.query(
        TimeEntry.date.label("date"),
        (func.sum(func.coalesce(TimeEntry.hours, 0)) + func.sum(func.coalesce(TimeEntry.overtime_hours, 0))).label("total_hours")
    ).select_from(TimeEntry)
    
    query = apply_filters(query, **filters)
    result = query.group_by(TimeEntry.date).order_by(TimeEntry.date).all()
    return result
