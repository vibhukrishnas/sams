#!/usr/bin/env python
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from app.models.base import Base
from app.models import metric, agent
from config import Config

def init_database():
    """Initialize all configured databases"""
    for db_name, db_config in Config.DATABASES.items():
        if db_name == 'mongodb':
            continue
        print(f"Initializing {db_name} database...")
        engine = create_engine(db_config['url'])
        Base.metadata.create_all(engine)
        print(f"✓ {db_name} tables created successfully")

if __name__ == "__main__":
    init_database()
