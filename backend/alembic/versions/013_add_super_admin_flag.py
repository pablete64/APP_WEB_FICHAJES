"""add super admin flag to users

Revision ID: 013_add_super_admin_flag
Revises: 012_proj_code_active
Create Date: 2026-05-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "013_add_super_admin_flag"
down_revision: Union[str, None] = "012_proj_code_active"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_super_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("users", "is_super_admin", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_super_admin")
