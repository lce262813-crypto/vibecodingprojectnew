"""Add account personalization settings and private diary photos.

Revision ID: 20261104_0011
Revises: 20261104_0010
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261104_0011"
down_revision: str | None = "20261104_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("avatar_file", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("representative_character_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("theme", sa.String(length=20), nullable=False, server_default="cream"))
        batch_op.add_column(sa.Column("notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("notification_time", sa.String(length=5), nullable=False, server_default="21:00"))
        batch_op.add_column(sa.Column("room_background", sa.String(length=20), nullable=False, server_default="cream"))
    op.create_table(
        "diary_photos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("daily_entry_id", sa.String(length=36), nullable=False),
        sa.Column("stored_name", sa.String(length=100), nullable=False),
        sa.Column("content_type", sa.String(length=30), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["daily_entry_id"], ["daily_entries.id"], name=op.f("fk_diary_photos_daily_entry_id_daily_entries"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_diary_photos")),
        sa.UniqueConstraint("daily_entry_id", name=op.f("uq_diary_photos_daily_entry_id")),
        sa.UniqueConstraint("stored_name", name=op.f("uq_diary_photos_stored_name")),
    )
    op.create_index(op.f("ix_diary_photos_daily_entry_id"), "diary_photos", ["daily_entry_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_diary_photos_daily_entry_id"), table_name="diary_photos")
    op.drop_table("diary_photos")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("room_background")
        batch_op.drop_column("notification_time")
        batch_op.drop_column("notifications_enabled")
        batch_op.drop_column("theme")
        batch_op.drop_column("representative_character_id")
        batch_op.drop_column("avatar_file")
