import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DEBUG = False
    TESTING = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # Database URLs
    DATABASES = {
        'mysql': {
            'url': f"mysql+pymysql://{os.environ.get('MYSQL_USER')}:{os.environ.get('MYSQL_PASSWORD')}@{os.environ.get('MYSQL_HOST', 'localhost')}:{os.environ.get('MYSQL_PORT', 3306)}/{os.environ.get('MYSQL_DB', 'sams_metrics')}",
            'pool_size': 10,
            'max_overflow': 20,
            'pool_pre_ping': True,
            'pool_recycle': 3600
        },
        'postgresql': {
            'url': f"postgresql://{os.environ.get('POSTGRES_USER')}:{os.environ.get('POSTGRES_PASSWORD')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', 5432)}/{os.environ.get('POSTGRES_DB', 'sams_metrics')}",
            'pool_size': 10,
            'max_overflow': 20
        },
        'oracle': {
            'url': f"oracle+cx_oracle://{os.environ.get('ORACLE_USER')}:{os.environ.get('ORACLE_PASSWORD')}@{os.environ.get('ORACLE_HOST', 'localhost')}:{os.environ.get('ORACLE_PORT', 1521)}/{os.environ.get('ORACLE_SID', 'SAMS')}",
            'pool_size': 10
        },
        'sqlserver': {
            'url': f"mssql+pyodbc://{os.environ.get('SQLSERVER_USER')}:{os.environ.get('SQLSERVER_PASSWORD')}@{os.environ.get('SQLSERVER_HOST', 'localhost')}:{os.environ.get('SQLSERVER_PORT', 1433)}/{os.environ.get('SQLSERVER_DB', 'sams_metrics')}?driver=ODBC+Driver+17+for+SQL+Server",
            'pool_size': 10
        }
    }
    
    # Redis Configuration
    REDIS_URL = f"redis://:{os.environ.get('REDIS_PASSWORD', '')}@{os.environ.get('REDIS_HOST', 'localhost')}:{os.environ.get('REDIS_PORT', 6379)}/0"
    
    # WebSocket Configuration
    SOCKETIO_MESSAGE_QUEUE = REDIS_URL
    SOCKETIO_ASYNC_MODE = 'eventlet'
    
    # Monitoring Configuration
    METRICS_COLLECTION_INTERVAL = 5  # seconds
    METRICS_RETENTION_DAYS = 30
    ALERT_CHECK_INTERVAL = 10  # seconds

class DevelopmentConfig(Config):
    DEBUG = True
    
class ProductionConfig(Config):
    DEBUG = False
