"""allow reusing soft-deleted project codes

Revision ID: 012_proj_code_active
Revises: 011_task_roles_sync
Create Date: 2026-04-20

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "012_proj_code_active"
down_revision: Union[str, None] = "011_task_roles_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_projects_code", table_name="projects")
    op.create_index("ix_projects_code", "projects", ["code"], unique=False)
    op.create_index(
        "uq_projects_code_active",
        "projects",
        ["code"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_projects_code_active", table_name="projects")
    op.drop_index("ix_projects_code", table_name="projects")
    op.create_index("ix_projects_code", "projects", ["code"], unique=True)
