"""Restore default user role field

Revision ID: 008_restore_default_user_role
Revises: 007_drop_legacy_user_role
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa


revision = "008_restore_default_user_role"
down_revision = "007_drop_legacy_user_role"
branch_labels = None
depends_on = None


ROLE_MAP = {
    "manolosal": "MONTADORES",
    "albertorey": "MONTADORES",
    "jonathanmor": "MONTADORES",
    "antonioval": "MONTADORES",
    "mariogar": "MONTADORES",
    "jhonatanjan": "MONTADORES",
    "sergiogar": "MONTADORES",
    "danicar": "MONTADORES",
    "jesusutr": "MONTADORES",
    "jmoral": "MONTADORES",
    "carlosgon": "MONTADORES",
    "davidfer": "MONTADORES",
    "ivandelo": "MONTADORES",
    "xaviercas": "MONTADORES",
    "arnauani": "PROGRAMADORES",
    "antoniomer": "PROGRAMADORES",
    "franciscorey": "PROYECTISTAS ELECTRICOS",
    "albertoher": "PROYECTISTAS MECANICOS",
    "antoniosil": "PROYECTISTAS MECANICOS",
    "marcomur": "PROYECTISTAS MECANICOS",
    "rjauregui": "PROYECTISTAS MECANICOS",
    "CMartin": "MANAGEMENT",
    "GPinol": "MANAGEMENT",
    "ESoriano": "MANAGEMENT",
    "PCabaleiro": "MANAGEMENT",
    "ADMIN": "MANAGEMENT",
}


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=50), nullable=False, server_default=""))

    bind = op.get_bind()
    for employee_code, role in ROLE_MAP.items():
        bind.execute(
            sa.text("UPDATE users SET role = :role WHERE employee_code = :employee_code"),
            {"employee_code": employee_code, "role": role},
        )

    bind.execute(
        sa.text(
            """
            UPDATE users u
            SET role = pu.role
            FROM (
                SELECT DISTINCT ON (user_id) user_id, role
                FROM project_users
                WHERE role IS NOT NULL AND role <> ''
                ORDER BY user_id, project_id
            ) pu
            WHERE u.id = pu.user_id AND (u.role IS NULL OR u.role = '')
            """
        )
    )

    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "role")
