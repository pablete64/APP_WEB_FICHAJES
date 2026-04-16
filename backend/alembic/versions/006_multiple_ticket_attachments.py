"""Support multiple ticket attachments per time entry

Revision ID: 006_multiple_ticket_attachments
Revises: 005_meal_ticket_fields
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision = "006_multiple_ticket_attachments"
down_revision = "005_meal_ticket_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "time_entry_tickets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("time_entry_id", sa.String(length=36), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["time_entry_id"], ["time_entries.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_time_entry_tickets_time_entry_id"), "time_entry_tickets", ["time_entry_id"], unique=False)

    bind = op.get_bind()
    legacy_rows = bind.execute(
        sa.text(
            "SELECT id, meal_ticket_photo FROM time_entries "
            "WHERE meal_ticket_photo IS NOT NULL AND meal_ticket_photo <> ''"
        )
    ).fetchall()

    for row in legacy_rows:
        bind.execute(
            sa.text(
                "INSERT INTO time_entry_tickets (id, time_entry_id, file_path, original_filename) "
                "VALUES (:id, :time_entry_id, :file_path, :original_filename)"
            ),
            {
                "id": str(uuid.uuid4()),
                "time_entry_id": row.id,
                "file_path": row.meal_ticket_photo,
                "original_filename": None,
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_time_entry_tickets_time_entry_id"), table_name="time_entry_tickets")
    op.drop_table("time_entry_tickets")
