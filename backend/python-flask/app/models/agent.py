from sqlalchemy import Column, String, Boolean, DateTime, JSON
from .base import Base
from datetime import datetime

class Agent(Base):
    __tablename__ = 'agents'
    
    agent_id = Column(String(255), primary_key=True)
    hostname = Column(String(255))
    ip_address = Column(String(45))
    os_type = Column(String(50))
    os_version = Column(String(100))
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime)
    registered_at = Column(DateTime, default=datetime.utcnow)
    system_info = Column(JSON)
