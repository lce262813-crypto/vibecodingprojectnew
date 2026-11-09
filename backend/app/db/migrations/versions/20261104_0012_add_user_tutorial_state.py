"""Track each account's welcome tutorial progress.

Accounts that already exist have been using the app, so they count as finished
and never see the tutorial. Only accounts created after this migration start it.

Revision ID: 20261104_0012
Revises: 20261104_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261104_0012"
down_revision: str | None = "20261104_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("tutorial_completed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("tutorial_step", sa.Integer(), nullable=False, server_default="0"))
    op.execute("UPDATE users SET tutorial_completed_at = CURRENT_TIMESTAMP")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("tutorial_step")
        batch_op.drop_column("tutorial_completed_at")
