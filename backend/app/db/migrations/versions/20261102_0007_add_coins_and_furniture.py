"""Add user coins and owned room furniture.

Existing users receive the coins they would have earned for diaries already
written: 100 per encounter plus 50 per character first met.

Revision ID: 20261102_0007
Revises: 20261102_0006
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0007"
down_revision: str | None = "20261102_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("coins", sa.Integer(), nullable=False, server_default="0")
        )
    op.execute(
        """
        UPDATE users SET coins =
            100 * (SELECT COUNT(*) FROM encounters
                   JOIN characters ON characters.id = encounters.character_id
                   WHERE characters.user_id = users.id)
            + 50 * (SELECT COUNT(*) FROM characters
                    WHERE characters.user_id = users.id)
        """
    )
    op.create_table(
        "owned_furniture",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("item_id", sa.String(length=30), nullable=False),
        sa.Column("is_placed", sa.Boolean(), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name=op.f("fk_owned_furniture_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_owned_furniture")),
        sa.UniqueConstraint("user_id", "item_id", name="uq_owned_furniture_user_item"),
    )
    op.create_index(op.f("ix_owned_furniture_user_id"), "owned_furniture", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_owned_furniture_user_id"), table_name="owned_furniture")
    op.drop_table("owned_furniture")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("coins")
