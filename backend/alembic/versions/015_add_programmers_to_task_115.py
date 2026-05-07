"""Allow programmers on task 115

Revision ID: 015_add_programmers_to_task_115
Revises: 014_add_user_time_entry_mode
Create Date: 2026-05-07

"""

from alembic import op
import sqlalchemy as sa


revision = "015_add_programmers_to_task_115"
down_revision = "014_add_user_time_entry_mode"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE tasks
            SET allowed_roles = '["PROYECTISTAS MECANICOS","PROGRAMADORES","MANAGEMENT"]'::json
            WHERE code = '115'
            """
        )
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE tasks
            SET allowed_roles = '["PROYECTISTAS MECANICOS","MANAGEMENT"]'::json
            WHERE code = '115'
            """
        )
    )
