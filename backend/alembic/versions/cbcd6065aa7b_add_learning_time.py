"""Add learning time

Revision ID: cbcd6065aa7b
Revises: d0549965895f
Create Date: 2026-08-03 12:48:25.112125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'cbcd6065aa7b'
down_revision: Union[str, Sequence[str], None] = 'd0549965895f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('topics', sa.Column('learning_time_seconds', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('topics', 'learning_time_seconds')
