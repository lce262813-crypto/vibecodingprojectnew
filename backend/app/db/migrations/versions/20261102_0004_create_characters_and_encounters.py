"""Create characters and encounters.

Revision ID: 20261102_0004
Revises: 20261102_0003
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0004"
down_revision: str | None = "20261102_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "characters",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("fingerprint", sa.String(length=160), nullable=False),
        sa.Column("algorithm_version", sa.String(length=20), nullable=False),
        sa.Column("seed", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=12), nullable=False),
        sa.Column("body_part", sa.String(length=30), nullable=False),
        sa.Column("palette", sa.String(length=30), nullable=False),
        sa.Column("eyebrow_part", sa.String(length=30), nullable=False),
        sa.Column("eye_part", sa.String(length=30), nullable=False),
        sa.Column("mouth_part", sa.String(length=30), nullable=False),
        sa.Column("mutation_part", sa.String(length=30), nullable=True),
        sa.Column("behavior_type", sa.String(length=30), nullable=False),
        sa.Column("is_resident", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"],
            name=op.f("fk_characters_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_characters")),
        sa.UniqueConstraint(
            "user_id", "fingerprint", name="uq_characters_user_fingerprint"
        ),
    )
    op.create_index(op.f("ix_characters_user_id"), "characters", ["user_id"])

    op.create_table(
        "encounters",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("character_id", sa.String(length=36), nullable=False),
        sa.Column("daily_entry_id", sa.String(length=36), nullable=False),
        sa.Column("intensity_level", sa.Integer(), nullable=False),
        sa.Column("accessory_part", sa.String(length=30), nullable=True),
        sa.Column("effect_parts", sa.JSON(), nullable=False),
        sa.Column("dialogue_group", sa.String(length=30), nullable=False),
        sa.Column("met_on", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["character_id"], ["characters.id"],
            name=op.f("fk_encounters_character_id_characters"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["daily_entry_id"], ["daily_entries.id"],
            name=op.f("fk_encounters_daily_entry_id_daily_entries"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_encounters")),
    )
    op.create_index(op.f("ix_encounters_character_id"), "encounters", ["character_id"])
    op.create_index(
        op.f("ix_encounters_daily_entry_id"),
        "encounters", ["daily_entry_id"], unique=True
    )
    op.create_index(op.f("ix_encounters_met_on"), "encounters", ["met_on"])


def downgrade() -> None:
    op.drop_index(op.f("ix_encounters_met_on"), table_name="encounters")
    op.drop_index(op.f("ix_encounters_daily_entry_id"), table_name="encounters")
    op.drop_index(op.f("ix_encounters_character_id"), table_name="encounters")
    op.drop_table("encounters")
    op.drop_index(op.f("ix_characters_user_id"), table_name="characters")
    op.drop_table("characters")
