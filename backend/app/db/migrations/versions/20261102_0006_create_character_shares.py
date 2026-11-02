"""Create character share links.

Revision ID: 20261102_0006
Revises: 20261102_0005
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0006"
down_revision: str | None = "20261102_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "character_shares",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("character_id", sa.String(length=36), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["character_id"], ["characters.id"],
            name=op.f("fk_character_shares_character_id_characters"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_character_shares")),
    )
    op.create_index(
        op.f("ix_character_shares_character_id"), "character_shares", ["character_id"]
    )
    op.create_index(
        op.f("ix_character_shares_token"), "character_shares", ["token"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_character_shares_token"), table_name="character_shares")
    op.drop_index(op.f("ix_character_shares_character_id"), table_name="character_shares")
    op.drop_table("character_shares")
