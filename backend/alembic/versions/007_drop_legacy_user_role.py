"""Drop legacy global role from users

Revision ID: 007_drop_legacy_user_role
Revises: 006_multiple_ticket_attachments
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "007_drop_legacy_user_role"
down_revision = "006_multiple_ticket_attachments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "role")


def downgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=50), nullable=False, server_default=""))
    op.alter_column("users", "role", server_default=None)
