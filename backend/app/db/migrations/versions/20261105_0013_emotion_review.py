"""Add evidence-based review without rewriting any legacy analysis or character."""
from alembic import op
import sqlalchemy as sa

revision = "20261105_0013"
down_revision = "20261104_0012"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("emotion_analyses") as batch:
        batch.alter_column("primary_emotion", existing_type=sa.String(30), nullable=True)
        batch.add_column(sa.Column("ai_original", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("review", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("review_revision", sa.Integer(), nullable=False, server_default="0"))
    with op.batch_alter_table("daily_entries") as batch:
        batch.alter_column("status", existing_type=sa.String(20), type_=sa.String(30), existing_nullable=False)
        batch.add_column(sa.Column("analysis_token", sa.String(36), nullable=True))
        batch.add_column(sa.Column("analysis_started_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # New uncertain records have no primary emotion; a destructive downgrade is unsafe.
    raise RuntimeError("Review data must be exported and explicitly migrated before downgrade.")
