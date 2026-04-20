"""Sync task allowed roles matrix

Revision ID: 011_task_roles_sync
Revises: 010_add_project_client
Create Date: 2026-04-20

"""

from alembic import op
import sqlalchemy as sa


revision = "011_task_roles_sync"
down_revision = "010_add_project_client"
branch_labels = None
depends_on = None


TASK_ROLE_MAP = {
    "100": '["PROYECTISTAS MECANICOS","PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "111": '["PROYECTISTAS MECANICOS","MANAGEMENT"]',
    "112": '["PROYECTISTAS MECANICOS","MANAGEMENT"]',
    "113": '["PROYECTISTAS MECANICOS","MANAGEMENT"]',
    "114": '["PROYECTISTAS MECANICOS","MANAGEMENT"]',
    "115": '["PROYECTISTAS MECANICOS","MANAGEMENT"]',
    "121": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "122": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "123": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "124": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "125": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "126": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "127": '["PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]',
    "211": '["MONTADORES","MANAGEMENT"]',
    "212": '["MONTADORES","MANAGEMENT"]',
    "221": '["MONTADORES","MANAGEMENT"]',
    "222": '["MONTADORES","MANAGEMENT"]',
    "311": '["MANAGEMENT"]',
    "312": '["MANAGEMENT"]',
    "313": '["MONTADORES","MANAGEMENT"]',
    "321": '["PROYECTISTAS ELECTRICOS","MONTADORES","MANAGEMENT"]',
    "322": '["PROYECTISTAS ELECTRICOS","MONTADORES","MANAGEMENT"]',
    "411": '["MONTADORES","MANAGEMENT"]',
    "421": '["PROYECTISTAS ELECTRICOS","MONTADORES","MANAGEMENT"]',
    "422": '["PROYECTISTAS ELECTRICOS","MANAGEMENT"]',
    "431": '["PROGRAMADORES","MANAGEMENT"]',
    "432": '["PROGRAMADORES","MANAGEMENT"]',
    "433": '["PROGRAMADORES","MANAGEMENT"]',
}


def upgrade() -> None:
    bind = op.get_bind()
    for code, allowed_roles in TASK_ROLE_MAP.items():
        bind.execute(
            sa.text(
                """
                UPDATE tasks
                SET allowed_roles = CAST(:allowed_roles AS json)
                WHERE code = :code
                """
            ),
            {"code": code, "allowed_roles": allowed_roles},
        )


def downgrade() -> None:
    pass
