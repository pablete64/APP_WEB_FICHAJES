"""Rename task 100 to Simulacion

Revision ID: 016_task_100_simulacion
Revises: 015_add_programmers_to_task_115
Create Date: 2026-05-07

"""

from alembic import op
import sqlalchemy as sa


revision = "016_task_100_simulacion"
down_revision = "015_add_programmers_to_task_115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE tasks
            SET name = 'Simulación'
            WHERE code = '100'
            """
        )
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE tasks
            SET name = 'Ofertas'
            WHERE code = '100'
            """
        )
    )
