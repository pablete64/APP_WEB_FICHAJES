"""Add offer task 100

Revision ID: 009_add_offer_task_100
Revises: 008_restore_default_user_role
Create Date: 2026-04-20

"""

from alembic import op
import sqlalchemy as sa


revision = "009_add_offer_task_100"
down_revision = "008_restore_default_user_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO tasks (id, code, name, category, requires_extra_fields, allowed_roles)
            VALUES (:id, '100', 'Ofertas', 'Oficina Técnica', false, '["PROYECTISTAS MECANICOS","PROYECTISTAS ELECTRICOS","PROGRAMADORES","MANAGEMENT"]'::json)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                requires_extra_fields = EXCLUDED.requires_extra_fields,
                allowed_roles = EXCLUDED.allowed_roles
            """
        ),
        {"id": "task-offers-100"},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM tasks WHERE code = '100'"))
