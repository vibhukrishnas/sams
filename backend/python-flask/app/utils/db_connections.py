from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker, scoped_session
import pymongo
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, config):
        self.config = config
        self.engines = {}
        self.sessions = {}
        self._initialize_connections()
    
    def _initialize_connections(self):
        """Initialize all database connections with pooling"""
        for db_name, db_config in self.config['DATABASES'].items():
            try:
                if db_name == 'mongodb':
                    # MongoDB connection
                    self.engines[db_name] = pymongo.MongoClient(db_config['url'])
                else:
                    # SQL database connections
                    engine = create_engine(
                        db_config['url'],
                        poolclass=pool.QueuePool,
                        pool_size=db_config.get('pool_size', 10),
                        max_overflow=db_config.get('max_overflow', 20),
                        pool_pre_ping=db_config.get('pool_pre_ping', True),
                        pool_recycle=db_config.get('pool_recycle', 3600),
                        echo=False
                    )
                    self.engines[db_name] = engine
                    
                    # Create session factory
                    session_factory = sessionmaker(bind=engine)
                    self.sessions[db_name] = scoped_session(session_factory)
                    
                logger.info(f"Successfully connected to {db_name}")
            except Exception as e:
                logger.error(f"Failed to connect to {db_name}: {str(e)}")
    
    @contextmanager
    def get_session(self, db_name='mysql'):
        """Get database session with automatic cleanup"""
        if db_name not in self.sessions:
            raise ValueError(f"Database {db_name} not configured")
        
        session = self.sessions[db_name]()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def execute_query(self, query, params=None, db_name='mysql'):
        """Execute raw SQL query"""
        with self.engines[db_name].connect() as conn:
            result = conn.execute(query, params or {})
            return result.fetchall()
    
    def close_all(self):
        """Close all database connections"""
        for db_name, engine in self.engines.items():
            if hasattr(engine, 'dispose'):
                engine.dispose()
