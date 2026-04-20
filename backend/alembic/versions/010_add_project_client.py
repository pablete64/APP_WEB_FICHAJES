"""Add client field to projects

Revision ID: 010_add_project_client
Revises: 009_add_offer_task_100
Create Date: 2026-04-20

"""

from alembic import op
import sqlalchemy as sa


revision = "010_add_project_client"
down_revision = "009_add_offer_task_100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("client", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "client")
