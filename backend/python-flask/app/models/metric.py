from sqlalchemy import Column, String, Float, BigInteger, Integer, JSON, ForeignKey, Index
from .base import Base, TimestampMixin

class Metric(Base, TimestampMixin):
    __tablename__ = 'metrics'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    agent_id = Column(String(255), ForeignKey('agents.agent_id'), nullable=False)
    cpu_usage = Column(Float)
    memory_usage = Column(Float)
    disk_usage = Column(Float)
    network_in = Column(BigInteger)
    network_out = Column(BigInteger)
    process_count = Column(Integer)
    load_average = Column(Float)
    additional_data = Column(JSON)
    
    __table_args__ = (
        Index('idx_agent_timestamp', 'agent_id', 'created_at'),
    )
