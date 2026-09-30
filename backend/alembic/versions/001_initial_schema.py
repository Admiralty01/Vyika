"""Initial Schema Migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-28 16:50:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Migration tables are managed automatically via SQLAlchemy metadata Base.metadata.create_all
    pass

def downgrade() -> None:
    pass
