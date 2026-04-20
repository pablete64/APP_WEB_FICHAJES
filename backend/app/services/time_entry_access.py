from app.models.project import Project
from app.models.task import Task


def normalize_role(role: str | None) -> str:
    return (role or "").strip().upper()


def is_management_role(role: str | None) -> bool:
    return normalize_role(role) in {"MANAGEMENT", "ADMIN"}


def is_task_allowed_for_role(role: str | None, task: Task, project: Project | None = None) -> bool:
    normalized_role = normalize_role(role)
    code = str(getattr(task, "code", "") or "")

    if not normalized_role or not code:
        return False

    if is_management_role(normalized_role):
        return True

    if normalized_role == "PROYECTISTAS MECANICOS":
        return code == "100" or code.startswith("11")

    if normalized_role == "PROYECTISTAS ELECTRICOS":
        return code == "100" or code.startswith("12") or code.startswith("32") or code.startswith("42")

    if normalized_role == "PROGRAMADORES":
        return code == "100" or code.startswith("12") or code.startswith("43")

    if normalized_role == "MONTADORES":
        return code.startswith("2")

    return False
