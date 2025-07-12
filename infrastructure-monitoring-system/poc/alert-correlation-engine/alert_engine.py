#!/usr/bin/env python3
"""
SAMS Alert Correlation Engine POC

This POC demonstrates intelligent alert correlation and processing:
- Rule-based alert correlation
- Alert severity escalation
- Duplicate alert suppression
- Pattern recognition
- Notification routing
- Alert lifecycle management

@version 1.0.0
@author SAMS Development Team
"""

import json
import sqlite3
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertStatus(Enum):
    """Alert status states"""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    source: str
    server_id: str
    server_name: str
    alert_type: str
    severity: AlertSeverity
    message: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.OPEN
    correlation_id: Optional[str] = None
    suppressed_count: int = 0
    escalation_level: int = 0
    metadata: Dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class CorrelationRule:
    """Alert correlation rule"""
    id: str
    name: str
    description: str
    conditions: Dict
    actions: Dict
    enabled: bool = True
    priority: int = 1


class AlertCorrelationEngine:
    """Main alert correlation engine"""

    def __init__(self, db_path: str = "alerts.db"):
        self.db_path = db_path
        self.correlation_rules: List[CorrelationRule] = []
        self.active_alerts: Dict[str, Alert] = {}
        self.correlation_groups: Dict[str, List[str]] = {}
        self.suppression_windows: Dict[str, datetime] = {}
        self.lock = threading.Lock()
        
        # Initialize database
        self._init_database()
        
        # Load default correlation rules
        self._load_default_rules()
        
        logger.info("🚀 Alert Correlation Engine initialized")

    def _init_database(self):
        """Initialize SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create alerts table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    server_id TEXT NOT NULL,
                    server_name TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL,
                    correlation_id TEXT,
                    suppressed_count INTEGER DEFAULT 0,
                    escalation_level INTEGER DEFAULT 0,
                    metadata TEXT
                )
            ''')
            
            # Create correlation_rules table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS correlation_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    conditions TEXT NOT NULL,
                    actions TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    priority INTEGER DEFAULT 1
                )
            ''')
            
            # Create alert_history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alert_history (
                    id TEXT PRIMARY KEY,
                    alert_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    details TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Database initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            raise

    def _load_default_rules(self):
        """Load default correlation rules"""
        default_rules = [
            CorrelationRule(
                id="cpu-memory-correlation",
                name="CPU and Memory Correlation",
                description="Correlate high CPU and memory alerts from same server",
                conditions={
                    "alert_types": ["cpu_high", "memory_high"],
                    "time_window": 300,  # 5 minutes
                    "same_server": True
                },
                actions={
                    "create_correlation": True,
                    "escalate_severity": True,
                    "suppress_duplicates": True
                }
            ),
            CorrelationRule(
                id="network-connectivity",
                name="Network Connectivity Issues",
                description="Correlate network-related alerts",
                conditions={
                    "alert_types": ["network_down", "connection_timeout", "dns_failure"],
                    "time_window": 180,  # 3 minutes
                    "minimum_count": 2
                },
                actions={
                    "create_correlation": True,
                    "escalate_severity": True,
                    "notify_network_team": True
                }
            ),
            CorrelationRule(
                id="disk-space-escalation",
                name="Disk Space Escalation",
                description="Escalate disk space alerts based on frequency",
                conditions={
                    "alert_types": ["disk_space_low"],
                    "time_window": 600,  # 10 minutes
                    "frequency_threshold": 3
                },
                actions={
                    "escalate_severity": True,
                    "suppress_duplicates": True,
                    "create_maintenance_ticket": True
                }
            ),
            CorrelationRule(
                id="service-dependency",
                name="Service Dependency Correlation",
                description="Correlate alerts based on service dependencies",
                conditions={
                    "alert_types": ["service_down", "database_connection_failed"],
                    "time_window": 120,  # 2 minutes
                    "dependency_check": True
                },
                actions={
                    "create_correlation": True,
                    "identify_root_cause": True,
                    "suppress_dependent_alerts": True
                }
            )
        ]
        
        self.correlation_rules = default_rules
        logger.info(f"📋 Loaded {len(default_rules)} default correlation rules")

    def process_alert(self, alert_data: Dict) -> Alert:
        """Process incoming alert"""
        try:
            # Create Alert object
            alert = Alert(
                id=alert_data.get('id', str(uuid.uuid4())),
                source=alert_data['source'],
                server_id=alert_data['server_id'],
                server_name=alert_data['server_name'],
                alert_type=alert_data['alert_type'],
                severity=AlertSeverity(alert_data['severity']),
                message=alert_data['message'],
                timestamp=datetime.fromisoformat(alert_data.get('timestamp', datetime.now().isoformat())),
                metadata=alert_data.get('metadata', {})
            )
            
            logger.info(f"📨 Processing alert: {alert.id} - {alert.message}")
            
            with self.lock:
                # Check for suppression
                if self._is_suppressed(alert):
                    alert.status = AlertStatus.SUPPRESSED
                    self._update_suppression_count(alert)
                    logger.info(f"🔇 Alert suppressed: {alert.id}")
                    return alert
                
                # Store alert
                self.active_alerts[alert.id] = alert
                self._save_alert_to_db(alert)
                
                # Apply correlation rules
                self._apply_correlation_rules(alert)
                
                # Log alert processing
                self._log_alert_action(alert.id, "processed", {"initial_severity": alert.severity.value})
                
            logger.info(f"✅ Alert processed successfully: {alert.id}")
            return alert
            
        except Exception as e:
            logger.error(f"❌ Error processing alert: {e}")
            raise

    def _is_suppressed(self, alert: Alert) -> bool:
        """Check if alert should be suppressed"""
        suppression_key = f"{alert.server_id}:{alert.alert_type}"
        
        if suppression_key in self.suppression_windows:
            if datetime.now() < self.suppression_windows[suppression_key]:
                return True
            else:
                # Suppression window expired
                del self.suppression_windows[suppression_key]
        
        return False

    def _update_suppression_count(self, alert: Alert):
        """Update suppression count for similar alerts"""
        for existing_alert in self.active_alerts.values():
            if (existing_alert.server_id == alert.server_id and 
                existing_alert.alert_type == alert.alert_type and
                existing_alert.status != AlertStatus.RESOLVED):
                existing_alert.suppressed_count += 1
                self._save_alert_to_db(existing_alert)
                break

    def _apply_correlation_rules(self, alert: Alert):
        """Apply correlation rules to the alert"""
        for rule in sorted(self.correlation_rules, key=lambda r: r.priority):
            if not rule.enabled:
                continue
                
            try:
                if self._rule_matches(alert, rule):
                    logger.info(f"📋 Applying rule: {rule.name} to alert {alert.id}")
                    self._execute_rule_actions(alert, rule)
                    
            except Exception as e:
                logger.error(f"❌ Error applying rule {rule.name}: {e}")

    def _rule_matches(self, alert: Alert, rule: CorrelationRule) -> bool:
        """Check if alert matches correlation rule conditions"""
        conditions = rule.conditions
        
        # Check alert type
        if "alert_types" in conditions:
            if alert.alert_type not in conditions["alert_types"]:
                return False
        
        # Check time window for related alerts
        if "time_window" in conditions:
            time_window = timedelta(seconds=conditions["time_window"])
            cutoff_time = alert.timestamp - time_window
            
            related_alerts = [
                a for a in self.active_alerts.values()
                if (a.timestamp >= cutoff_time and 
                    a.id != alert.id and
                    a.status == AlertStatus.OPEN)
            ]
            
            # Check same server condition
            if conditions.get("same_server", False):
                related_alerts = [
                    a for a in related_alerts
                    if a.server_id == alert.server_id
                ]
            
            # Check minimum count
            if "minimum_count" in conditions:
                if len(related_alerts) < conditions["minimum_count"] - 1:  # -1 because current alert counts
                    return False
            
            # Check frequency threshold
            if "frequency_threshold" in conditions:
                same_type_alerts = [
                    a for a in related_alerts
                    if a.alert_type == alert.alert_type
                ]
                if len(same_type_alerts) < conditions["frequency_threshold"] - 1:
                    return False
        
        return True

    def _execute_rule_actions(self, alert: Alert, rule: CorrelationRule):
        """Execute actions defined in correlation rule"""
        actions = rule.actions
        
        # Create correlation group
        if actions.get("create_correlation", False):
            self._create_correlation_group(alert, rule)
        
        # Escalate severity
        if actions.get("escalate_severity", False):
            self._escalate_alert_severity(alert)
        
        # Suppress duplicates
        if actions.get("suppress_duplicates", False):
            self._create_suppression_window(alert)
        
        # Custom notifications
        if actions.get("notify_network_team", False):
            self._send_notification("network_team", alert, rule)
        
        # Create maintenance ticket
        if actions.get("create_maintenance_ticket", False):
            self._create_maintenance_ticket(alert)
        
        # Identify root cause
        if actions.get("identify_root_cause", False):
            self._identify_root_cause(alert)

    def _create_correlation_group(self, alert: Alert, rule: CorrelationRule):
        """Create or update correlation group"""
        correlation_id = f"corr_{rule.id}_{int(time.time())}"
        
        # Find related alerts
        time_window = timedelta(seconds=rule.conditions.get("time_window", 300))
        cutoff_time = alert.timestamp - time_window
        
        related_alerts = [
            a for a in self.active_alerts.values()
            if (a.timestamp >= cutoff_time and 
                a.status == AlertStatus.OPEN and
                a.alert_type in rule.conditions.get("alert_types", []))
        ]
        
        if rule.conditions.get("same_server", False):
            related_alerts = [a for a in related_alerts if a.server_id == alert.server_id]
        
        # Update correlation IDs
        for related_alert in related_alerts:
            related_alert.correlation_id = correlation_id
            self._save_alert_to_db(related_alert)
        
        self.correlation_groups[correlation_id] = [a.id for a in related_alerts]
        
        logger.info(f"🔗 Created correlation group {correlation_id} with {len(related_alerts)} alerts")

    def _escalate_alert_severity(self, alert: Alert):
        """Escalate alert severity"""
        severity_order = [AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
        current_index = severity_order.index(alert.severity)
        
        if current_index < len(severity_order) - 1:
            old_severity = alert.severity
            alert.severity = severity_order[current_index + 1]
            alert.escalation_level += 1
            
            self._save_alert_to_db(alert)
            self._log_alert_action(alert.id, "escalated", {
                "old_severity": old_severity.value,
                "new_severity": alert.severity.value,
                "escalation_level": alert.escalation_level
            })
            
            logger.warning(f"⬆️ Alert {alert.id} escalated from {old_severity.value} to {alert.severity.value}")

    def _create_suppression_window(self, alert: Alert):
        """Create suppression window for similar alerts"""
        suppression_key = f"{alert.server_id}:{alert.alert_type}"
        suppression_duration = timedelta(minutes=10)  # 10-minute suppression window
        
        self.suppression_windows[suppression_key] = datetime.now() + suppression_duration
        
        logger.info(f"🔇 Created suppression window for {suppression_key}")

    def _send_notification(self, recipient: str, alert: Alert, rule: CorrelationRule):
        """Send notification to specified recipient"""
        notification = {
            "recipient": recipient,
            "alert_id": alert.id,
            "rule_name": rule.name,
            "message": f"Alert correlation triggered: {alert.message}",
            "severity": alert.severity.value,
            "timestamp": datetime.now().isoformat()
        }
        
        # In real implementation, this would send actual notifications
        logger.info(f"📧 Notification sent to {recipient}: {notification['message']}")

    def _create_maintenance_ticket(self, alert: Alert):
        """Create maintenance ticket for alert"""
        ticket = {
            "id": f"MAINT-{int(time.time())}",
            "alert_id": alert.id,
            "title": f"Maintenance required: {alert.server_name}",
            "description": alert.message,
            "priority": "high" if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY] else "medium",
            "created_at": datetime.now().isoformat()
        }
        
        # In real implementation, this would create actual tickets
        logger.info(f"🎫 Maintenance ticket created: {ticket['id']}")

    def _identify_root_cause(self, alert: Alert):
        """Attempt to identify root cause of alert"""
        # Simple root cause analysis based on alert patterns
        root_cause_hints = {
            "cpu_high": "Check for runaway processes or insufficient resources",
            "memory_high": "Check for memory leaks or insufficient RAM",
            "disk_space_low": "Clean up logs or expand storage",
            "network_down": "Check network connectivity and routing",
            "service_down": "Check service status and dependencies"
        }
        
        hint = root_cause_hints.get(alert.alert_type, "No specific guidance available")
        
        alert.metadata["root_cause_hint"] = hint
        self._save_alert_to_db(alert)
        
        logger.info(f"🔍 Root cause analysis for {alert.id}: {hint}")

    def _save_alert_to_db(self, alert: Alert):
        """Save alert to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO alerts 
                (id, source, server_id, server_name, alert_type, severity, message, 
                 timestamp, status, correlation_id, suppressed_count, escalation_level, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id, alert.source, alert.server_id, alert.server_name,
                alert.alert_type, alert.severity.value, alert.message,
                alert.timestamp.isoformat(), alert.status.value,
                alert.correlation_id, alert.suppressed_count, alert.escalation_level,
                json.dumps(alert.metadata)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Error saving alert to database: {e}")

    def _log_alert_action(self, alert_id: str, action: str, details: Dict = None):
        """Log alert action to history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alert_history (id, alert_id, action, timestamp, details)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), alert_id, action,
                datetime.now().isoformat(), json.dumps(details or {})
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Error logging alert action: {e}")

    def get_active_alerts(self) -> List[Dict]:
        """Get all active alerts"""
        with self.lock:
            return [asdict(alert) for alert in self.active_alerts.values()]

    def get_correlation_groups(self) -> Dict[str, List[str]]:
        """Get all correlation groups"""
        with self.lock:
            return self.correlation_groups.copy()

    def acknowledge_alert(self, alert_id: str, user: str = "system") -> bool:
        """Acknowledge an alert"""
        try:
            with self.lock:
                if alert_id in self.active_alerts:
                    alert = self.active_alerts[alert_id]
                    alert.status = AlertStatus.ACKNOWLEDGED
                    self._save_alert_to_db(alert)
                    self._log_alert_action(alert_id, "acknowledged", {"user": user})
                    
                    logger.info(f"✅ Alert {alert_id} acknowledged by {user}")
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"❌ Error acknowledging alert {alert_id}: {e}")
            return False

    def resolve_alert(self, alert_id: str, user: str = "system") -> bool:
        """Resolve an alert"""
        try:
            with self.lock:
                if alert_id in self.active_alerts:
                    alert = self.active_alerts[alert_id]
                    alert.status = AlertStatus.RESOLVED
                    self._save_alert_to_db(alert)
                    self._log_alert_action(alert_id, "resolved", {"user": user})
                    
                    # Remove from active alerts
                    del self.active_alerts[alert_id]
                    
                    logger.info(f"✅ Alert {alert_id} resolved by {user}")
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"❌ Error resolving alert {alert_id}: {e}")
            return False

    def get_statistics(self) -> Dict:
        """Get engine statistics"""
        with self.lock:
            stats = {
                "active_alerts": len(self.active_alerts),
                "correlation_groups": len(self.correlation_groups),
                "suppression_windows": len(self.suppression_windows),
                "correlation_rules": len(self.correlation_rules),
                "alerts_by_severity": {},
                "alerts_by_status": {},
                "alerts_by_server": {}
            }
            
            # Count by severity
            for alert in self.active_alerts.values():
                severity = alert.severity.value
                stats["alerts_by_severity"][severity] = stats["alerts_by_severity"].get(severity, 0) + 1
                
                status = alert.status.value
                stats["alerts_by_status"][status] = stats["alerts_by_status"].get(status, 0) + 1
                
                server = alert.server_name
                stats["alerts_by_server"][server] = stats["alerts_by_server"].get(server, 0) + 1
            
            return stats


if __name__ == "__main__":
    # Demo usage
    engine = AlertCorrelationEngine()
    
    # Sample alerts for testing
    sample_alerts = [
        {
            "source": "monitoring_agent",
            "server_id": "srv-001",
            "server_name": "Web Server 01",
            "alert_type": "cpu_high",
            "severity": "warning",
            "message": "CPU usage is 85%"
        },
        {
            "source": "monitoring_agent",
            "server_id": "srv-001",
            "server_name": "Web Server 01",
            "alert_type": "memory_high",
            "severity": "warning",
            "message": "Memory usage is 90%"
        },
        {
            "source": "monitoring_agent",
            "server_id": "srv-002",
            "server_name": "Database Server",
            "alert_type": "disk_space_low",
            "severity": "critical",
            "message": "Disk space is 95% full"
        }
    ]
    
    # Process sample alerts
    for alert_data in sample_alerts:
        engine.process_alert(alert_data)
        time.sleep(1)  # Small delay between alerts
    
    # Display statistics
    stats = engine.get_statistics()
    print("\n📊 Engine Statistics:")
    print(json.dumps(stats, indent=2))
    
    print("\n🔗 Correlation Groups:")
    groups = engine.get_correlation_groups()
    print(json.dumps(groups, indent=2))
    
    print("\n✅ Alert Correlation Engine POC completed successfully!")
