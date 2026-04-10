"""Add meal_ticket_amount and meal_ticket_photo to time_entries

Revision ID: 005_meal_ticket_fields
Revises: dc111475b166
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_meal_ticket_fields'
down_revision = '8a5d35a5d72c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('time_entries', sa.Column('meal_ticket_amount', sa.Numeric(8, 2), nullable=True))
    op.add_column('time_entries', sa.Column('meal_ticket_photo', sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column('time_entries', 'meal_ticket_photo')
    op.drop_column('time_entries', 'meal_ticket_amount')
