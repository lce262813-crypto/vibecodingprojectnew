"""Expand emotion analysis with ratios, evidence, provenance, and overrides.

Revision ID: 20261104_0008
Revises: 20261102_0007
Create Date: 2026-11-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261104_0008"
down_revision: str | None = "20261102_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("emotion_analyses") as batch_op:
        batch_op.add_column(sa.Column("primary_ratio", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("secondary_ratio", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("reason", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("events", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("objects", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("confidence", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("uncertainty_note", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("provider", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("model_name", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("prompt_version", sa.String(length=30), nullable=True))
        batch_op.add_column(
            sa.Column("is_user_edited", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("user_override", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("emotion_analyses") as batch_op:
        batch_op.drop_column("user_override")
        batch_op.drop_column("is_user_edited")
        batch_op.drop_column("prompt_version")
        batch_op.drop_column("model_name")
        batch_op.drop_column("provider")
        batch_op.drop_column("uncertainty_note")
        batch_op.drop_column("confidence")
        batch_op.drop_column("objects")
        batch_op.drop_column("events")
        batch_op.drop_column("reason")
        batch_op.drop_column("secondary_ratio")
        batch_op.drop_column("primary_ratio")
