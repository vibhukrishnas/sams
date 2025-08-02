from app.models.base import Base
from app.models import metric, agent
from alembic import context

target_metadata = Base.metadata
# ...existing Alembic env.py logic...
