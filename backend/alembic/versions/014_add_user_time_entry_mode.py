"""add user time entry mode

Revision ID: 014_add_user_time_entry_mode
Revises: 013_add_super_admin_flag
Create Date: 2026-05-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "014_add_user_time_entry_mode"
down_revision: Union[str, None] = "013_add_super_admin_flag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("time_entry_mode", sa.String(length=20), nullable=False, server_default="HOURS"),
    )
    op.alter_column("users", "time_entry_mode", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "time_entry_mode")
