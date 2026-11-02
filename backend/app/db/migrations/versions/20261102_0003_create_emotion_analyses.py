"""Create emotion analyses.

Revision ID: 20261102_0003
Revises: 20261102_0002
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0003"
down_revision: str | None = "20261102_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "emotion_analyses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("daily_entry_id", sa.String(length=36), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("base_emotions", sa.JSON(), nullable=False),
        sa.Column("primary_emotion", sa.String(length=30), nullable=False),
        sa.Column("secondary_emotions", sa.JSON(), nullable=False),
        sa.Column("detail_states", sa.JSON(), nullable=False),
        sa.Column("energy", sa.Integer(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=False),
        sa.Column("event_summary", sa.Text(), nullable=False),
        sa.Column("display_emotions", sa.JSON(), nullable=False),
        sa.Column("analysis_mode", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["daily_entry_id"],
            ["daily_entries.id"],
            name=op.f("fk_emotion_analyses_daily_entry_id_daily_entries"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_emotion_analyses")),
    )
    op.create_index(
        op.f("ix_emotion_analyses_daily_entry_id"),
        "emotion_analyses",
        ["daily_entry_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_emotion_analyses_daily_entry_id"),
        table_name="emotion_analyses",
    )
    op.drop_table("emotion_analyses")
