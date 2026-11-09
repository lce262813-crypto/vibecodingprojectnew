"""Add the versioned pixel renderer specification.

Revision ID: 20261104_0009
Revises: 20261104_0008
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261104_0009"
down_revision: str | None = "20261104_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable keeps every legacy character renderable by the existing PNG fallback.
    op.add_column("characters", sa.Column("render_spec", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "render_spec")
