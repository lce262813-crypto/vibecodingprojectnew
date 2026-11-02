"""Create daily entries.

Revision ID: 20261102_0002
Revises: 20261102_0001
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0002"
down_revision: str | None = "20261102_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_entries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("diary_text", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("analysis_mode", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_daily_entries_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_entries")),
        sa.UniqueConstraint(
            "user_id", "entry_date", name="uq_daily_entries_user_date"
        ),
    )
    op.create_index(
        op.f("ix_daily_entries_entry_date"),
        "daily_entries",
        ["entry_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_daily_entries_status"),
        "daily_entries",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_daily_entries_user_id"),
        "daily_entries",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_daily_entries_user_id"), table_name="daily_entries")
    op.drop_index(op.f("ix_daily_entries_status"), table_name="daily_entries")
    op.drop_index(op.f("ix_daily_entries_entry_date"), table_name="daily_entries")
    op.drop_table("daily_entries")
