"""Add an optional title to daily entries.

Revision ID: 20261102_0005
Revises: 20261102_0004
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261102_0005"
down_revision: str | None = "20261102_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("daily_entries", sa.Column("title", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_entries", "title")
