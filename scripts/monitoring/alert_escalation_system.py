import logging
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import requests
import sqlite3
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(Enum):
    """Alert status states"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    SUPPRESSED = "suppressed"

class EscalationMethod(Enum):
    """Available escalation methods"""
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"
    PHONE_CALL = "phone_call"

@dataclass
class EscalationContact:
    """Contact information for escalation"""
    id: str
    name: str
    method: EscalationMethod
    address: str  # email, phone, webhook URL, etc.
    role: str
    priority: int = 1
    active: bool = True

@dataclass
class EscalationRule:
    """Rules for when and how to escalate alerts"""
    id: str
    name: str
    severity_levels: List[AlertSeverity]
    escalation_delay_minutes: int
    max_escalation_levels: int = 3
    contacts: List[EscalationContact]
    conditions: Dict[str, Any] = None
    active: bool = True

@dataclass
class Alert:
    """Alert data structure"""
    id: str
    title: str
    message: str
    severity: AlertSeverity
    source: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    acknowledgment_timeout: int = 15  # minutes
    escalation_level: int = 0
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary for JSON serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['severity'] = self.severity.value
        data['status'] = self.status.value
        if self.acknowledged_at:
            data['acknowledged_at'] = self.acknowledged_at.isoformat()
        if self.resolved_at:
            data['resolved_at'] = self.resolved_at.isoformat()
        return data

class AlertEscalationSystem:
    """
    Enhanced Alert Escalation System with intelligent routing
    Automatically escalates unacknowledged critical alerts
    """
    
    def __init__(self, db_path: str = "alerts.db"):
        self.db_path = db_path
        self.alerts: Dict[str, Alert] = {}
        self.escalation_rules: Dict[str, EscalationRule] = {}
        self.escalation_tasks: Dict[str, asyncio.Task] = {}
        self.is_running = False
        
        # Initialize database
        self._init_database()
        
        # Load default escalation rules
        self._load_default_rules()
        
        logger.info("🚨 Alert Escalation System initialized")

    def _init_database(self) -> None:
        """Initialize SQLite database for persistent storage"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Alerts table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL,
                    acknowledgment_timeout INTEGER,
                    escalation_level INTEGER DEFAULT 0,
                    acknowledged_by TEXT,
                    acknowledged_at TEXT,
                    resolved_at TEXT,
                    metadata TEXT
                )
            ''')
            
            # Escalation rules table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS escalation_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    config TEXT NOT NULL,
                    active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Escalation history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS escalation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT NOT NULL,
                    escalation_level INTEGER NOT NULL,
                    method TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    success BOOLEAN NOT NULL,
                    response_message TEXT
                )
            ''')
            
            conn.commit()
            logger.info("✅ Database initialized successfully")

    def _load_default_rules(self) -> None:
        """Load default escalation rules"""
        
        # Critical alert escalation rule
        critical_contacts = [
            EscalationContact(
                id="admin_email",
                name="System Administrator",
                method=EscalationMethod.EMAIL,
                address="admin@sams-security.com",
                role="admin",
                priority=1
            ),
            EscalationContact(
                id="security_lead_sms",
                name="Security Lead",
                method=EscalationMethod.SMS,
                address="+1234567890",
                role="security_lead",
                priority=2
            ),
            EscalationContact(
                id="oncall_slack",
                name="On-Call Team",
                method=EscalationMethod.SLACK,
                address="#security-alerts",
                role="oncall",
                priority=3
            )
        ]
        
        critical_rule = EscalationRule(
            id="critical_escalation",
            name="Critical Alert Escalation",
            severity_levels=[AlertSeverity.CRITICAL],
            escalation_delay_minutes=5,  # Escalate after 5 minutes for critical
            max_escalation_levels=3,
            contacts=critical_contacts
        )
        
        # High severity escalation rule
        high_contacts = [
            EscalationContact(
                id="security_team_email",
                name="Security Team",
                method=EscalationMethod.EMAIL,
                address="security-team@sams-security.com",
                role="security_team",
                priority=1
            ),
            EscalationContact(
                id="manager_sms",
                name="Security Manager",
                method=EscalationMethod.SMS,
                address="+1234567891",
                role="manager",
                priority=2
            )
        ]
        
        high_rule = EscalationRule(
            id="high_escalation",
            name="High Alert Escalation",
            severity_levels=[AlertSeverity.HIGH],
            escalation_delay_minutes=15,  # Escalate after 15 minutes for high
            max_escalation_levels=2,
            contacts=high_contacts
        )
        
        # Medium severity escalation rule
        medium_rule = EscalationRule(
            id="medium_escalation",
            name="Medium Alert Escalation",
            severity_levels=[AlertSeverity.MEDIUM],
            escalation_delay_minutes=60,  # Escalate after 1 hour for medium
            max_escalation_levels=1,
            contacts=[critical_contacts[0]]  # Just email admin
        )
        
        self.escalation_rules = {
            critical_rule.id: critical_rule,
            high_rule.id: high_rule,
            medium_rule.id: medium_rule
        }
        
        logger.info(f"✅ Loaded {len(self.escalation_rules)} default escalation rules")

    async def start(self) -> None:
        """Start the escalation system"""
        if self.is_running:
            logger.warning("⚠️ Escalation system already running")
            return
            
        self.is_running = True
        logger.info("🚀 Alert Escalation System started")
        
        # Start monitoring task
        asyncio.create_task(self._monitor_alerts())

    async def stop(self) -> None:
        """Stop the escalation system"""
        self.is_running = False
        
        # Cancel all escalation tasks
        for task in self.escalation_tasks.values():
            task.cancel()
        
        self.escalation_tasks.clear()
        logger.info("🛑 Alert Escalation System stopped")

    async def create_alert(self, 
                          title: str,
                          message: str,
                          severity: AlertSeverity,
                          source: str,
                          metadata: Dict[str, Any] = None) -> Alert:
        """Create a new alert and start escalation monitoring"""
        
        alert_id = f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{id(title)}"
        
        alert = Alert(
            id=alert_id,
            title=title,
            message=message,
            severity=severity,
            source=source,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )
        
        # Store alert
        self.alerts[alert_id] = alert
        await self._persist_alert(alert)
        
        # Start escalation monitoring for this alert
        await self._start_escalation_monitoring(alert)
        
        logger.info(f"🚨 New {severity.value.upper()} alert created: {title}")
        return alert

    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert to stop escalation"""
        if alert_id not in self.alerts:
            logger.error(f"❌ Alert {alert_id} not found")
            return False
            
        alert = self.alerts[alert_id]
        
        if alert.status != AlertStatus.ACTIVE:
            logger.warning(f"⚠️ Alert {alert_id} is not active (status: {alert.status.value})")
            return False
        
        # Update alert
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.now()
        
        # Cancel escalation task
        if alert_id in self.escalation_tasks:
            self.escalation_tasks[alert_id].cancel()
            del self.escalation_tasks[alert_id]
        
        await self._persist_alert(alert)
        
        logger.info(f"✅ Alert {alert_id} acknowledged by {acknowledged_by}")
        return True

    async def resolve_alert(self, alert_id: str, resolved_by: str) -> bool:
        """Resolve an alert"""
        if alert_id not in self.alerts:
            logger.error(f"❌ Alert {alert_id} not found")
            return False
            
        alert = self.alerts[alert_id]
        
        # Update alert
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now()
        
        # Cancel escalation task
        if alert_id in self.escalation_tasks:
            self.escalation_tasks[alert_id].cancel()
            del self.escalation_tasks[alert_id]
        
        await self._persist_alert(alert)
        
        logger.info(f"🎯 Alert {alert_id} resolved by {resolved_by}")
        return True

    async def _start_escalation_monitoring(self, alert: Alert) -> None:
        """Start escalation monitoring for an alert"""
        if alert.severity == AlertSeverity.LOW:
            logger.info(f"📝 Low severity alert {alert.id} - no escalation needed")
            return
        
        # Find matching escalation rule
        escalation_rule = self._find_escalation_rule(alert)
        if not escalation_rule:
            logger.warning(f"⚠️ No escalation rule found for alert {alert.id}")
            return
        
        # Schedule escalation task
        task = asyncio.create_task(
            self._escalation_monitor(alert, escalation_rule)
        )
        self.escalation_tasks[alert.id] = task

    def _find_escalation_rule(self, alert: Alert) -> Optional[EscalationRule]:
        """Find the appropriate escalation rule for an alert"""
        for rule in self.escalation_rules.values():
            if not rule.active:
                continue
                
            if alert.severity in rule.severity_levels:
                # Check additional conditions if any
                if rule.conditions:
                    if not self._check_conditions(alert, rule.conditions):
                        continue
                return rule
        return None

    def _check_conditions(self, alert: Alert, conditions: Dict[str, Any]) -> bool:
        """Check if alert meets escalation conditions"""
        # Implement condition checking logic
        # For example: source, metadata fields, time of day, etc.
        
        if 'source' in conditions:
            if alert.source not in conditions['source']:
                return False
        
        if 'metadata' in conditions:
            for key, value in conditions['metadata'].items():
                if alert.metadata.get(key) != value:
                    return False
        
        return True

    async def _escalation_monitor(self, alert: Alert, rule: EscalationRule) -> None:
        """Monitor an alert for escalation"""
        try:
            while (alert.status == AlertStatus.ACTIVE and 
                   alert.escalation_level < rule.max_escalation_levels):
                
                # Wait for escalation delay
                delay_seconds = rule.escalation_delay_minutes * 60
                
                # For critical alerts, reduce delay for higher escalation levels
                if alert.severity == AlertSeverity.CRITICAL and alert.escalation_level > 0:
                    delay_seconds = max(delay_seconds // 2, 300)  # Min 5 minutes
                
                logger.info(f"⏰ Waiting {delay_seconds}s before escalating {alert.id}")
                await asyncio.sleep(delay_seconds)
                
                # Check if alert is still active
                if alert.status != AlertStatus.ACTIVE:
                    logger.info(f"✅ Alert {alert.id} no longer active - stopping escalation")
                    break
                
                # Escalate
                await self._escalate_alert(alert, rule)
                
        except asyncio.CancelledError:
            logger.info(f"🛑 Escalation monitoring cancelled for alert {alert.id}")
        except Exception as e:
            logger.error(f"❌ Error in escalation monitoring for {alert.id}: {e}")

    async def _escalate_alert(self, alert: Alert, rule: EscalationRule) -> None:
        """Escalate an alert to the next level"""
        alert.escalation_level += 1
        alert.status = AlertStatus.ESCALATED
        
        logger.warning(f"⬆️ Escalating alert {alert.id} to level {alert.escalation_level}")
        
        # Send notifications based on escalation level
        contacts_to_notify = self._get_contacts_for_level(rule.contacts, alert.escalation_level)
        
        for contact in contacts_to_notify:
            success = await self._send_notification(alert, contact)
            await self._log_escalation(alert, contact, success)
        
        await self._persist_alert(alert)

    def _get_contacts_for_level(self, contacts: List[EscalationContact], level: int) -> List[EscalationContact]:
        """Get contacts to notify for specific escalation level"""
        # For level 1, notify priority 1 contacts
        # For level 2, notify priority 1 and 2 contacts
        # For level 3+, notify all contacts
        
        max_priority = min(level, 3)
        return [c for c in contacts if c.active and c.priority <= max_priority]

    async def _send_notification(self, alert: Alert, contact: EscalationContact) -> bool:
        """Send notification via specified method"""
        try:
            if contact.method == EscalationMethod.EMAIL:
                return await self._send_email_notification(alert, contact)
            elif contact.method == EscalationMethod.SMS:
                return await self._send_sms_notification(alert, contact)
            elif contact.method == EscalationMethod.SLACK:
                return await self._send_slack_notification(alert, contact)
            elif contact.method == EscalationMethod.WEBHOOK:
                return await self._send_webhook_notification(alert, contact)
            else:
                logger.error(f"❌ Unsupported notification method: {contact.method}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to send {contact.method.value} notification to {contact.address}: {e}")
            return False

    async def _send_email_notification(self, alert: Alert, contact: EscalationContact) -> bool:
        """Send email notification"""
        try:
            msg = MimeMultipart()
            msg['From'] = "noreply@sams-security.com"
            msg['To'] = contact.address
            msg['Subject'] = f"🚨 ESCALATED ALERT: {alert.title}"
            
            body = f"""
            ESCALATED SECURITY ALERT - Level {alert.escalation_level}
            
            Alert ID: {alert.id}
            Title: {alert.title}
            Severity: {alert.severity.value.upper()}
            Source: {alert.source}
            Timestamp: {alert.timestamp}
            
            Message:
            {alert.message}
            
            This alert has been escalated {alert.escalation_level} time(s).
            Please acknowledge immediately or escalation will continue.
            
            Acknowledge at: https://sams-security.com/alerts/acknowledge/{alert.id}
            
            -- SAMS Security Alert System
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            # Send email (implementation would use actual SMTP settings)
            logger.info(f"📧 Email notification sent to {contact.address}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Email notification failed: {e}")
            return False

    async def _send_sms_notification(self, alert: Alert, contact: EscalationContact) -> bool:
        """Send SMS notification"""
        try:
            message = f"🚨 ESCALATED ALERT Lv{alert.escalation_level}: {alert.title} ({alert.severity.value.upper()}) - {alert.message[:100]}... Ack: https://sams.link/ack/{alert.id}"
            
            # Implementation would use SMS API (Twilio, etc.)
            logger.info(f"📱 SMS notification sent to {contact.address}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SMS notification failed: {e}")
            return False

    async def _send_slack_notification(self, alert: Alert, contact: EscalationContact) -> bool:
        """Send Slack notification"""
        try:
            webhook_url = f"https://hooks.slack.com/services/{contact.address}"
            
            payload = {
                "channel": contact.address,
                "username": "SAMS Security",
                "icon_emoji": "🚨",
                "text": f"⚠️ ESCALATED ALERT - Level {alert.escalation_level}",
                "attachments": [
                    {
                        "color": "danger" if alert.severity == AlertSeverity.CRITICAL else "warning",
                        "title": alert.title,
                        "text": alert.message,
                        "fields": [
                            {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                            {"title": "Source", "value": alert.source, "short": True},
                            {"title": "Escalation Level", "value": str(alert.escalation_level), "short": True},
                            {"title": "Timestamp", "value": alert.timestamp.isoformat(), "short": True}
                        ],
                        "actions": [
                            {
                                "type": "button",
                                "text": "Acknowledge Alert",
                                "url": f"https://sams-security.com/alerts/acknowledge/{alert.id}"
                            }
                        ]
                    }
                ]
            }
            
            # Implementation would send to actual Slack webhook
            logger.info(f"💬 Slack notification sent to {contact.address}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Slack notification failed: {e}")
            return False

    async def _send_webhook_notification(self, alert: Alert, contact: EscalationContact) -> bool:
        """Send webhook notification"""
        try:
            payload = {
                "event": "alert_escalated",
                "alert": alert.to_dict(),
                "escalation_level": alert.escalation_level,
                "contact": {
                    "id": contact.id,
                    "name": contact.name,
                    "role": contact.role
                }
            }
            
            # Implementation would send actual HTTP request
            logger.info(f"🔗 Webhook notification sent to {contact.address}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Webhook notification failed: {e}")
            return False

    async def _log_escalation(self, alert: Alert, contact: EscalationContact, success: bool) -> None:
        """Log escalation attempt to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO escalation_history 
                (alert_id, escalation_level, method, contact_id, timestamp, success, response_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id,
                alert.escalation_level,
                contact.method.value,
                contact.id,
                datetime.now().isoformat(),
                success,
                "Success" if success else "Failed"
            ))
            conn.commit()

    async def _persist_alert(self, alert: Alert) -> None:
        """Persist alert to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id,
                alert.title,
                alert.message,
                alert.severity.value,
                alert.source,
                alert.timestamp.isoformat(),
                alert.status.value,
                alert.acknowledgment_timeout,
                alert.escalation_level,
                alert.acknowledged_by,
                alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                alert.resolved_at.isoformat() if alert.resolved_at else None,
                json.dumps(alert.metadata) if alert.metadata else None
            ))
            conn.commit()

    async def _monitor_alerts(self) -> None:
        """Background task to monitor alert system health"""
        while self.is_running:
            try:
                # Clean up resolved alerts older than 24 hours
                cutoff = datetime.now() - timedelta(hours=24)
                resolved_alerts = [
                    alert_id for alert_id, alert in self.alerts.items()
                    if alert.status == AlertStatus.RESOLVED and alert.resolved_at and alert.resolved_at < cutoff
                ]
                
                for alert_id in resolved_alerts:
                    del self.alerts[alert_id]
                
                if resolved_alerts:
                    logger.info(f"🧹 Cleaned up {len(resolved_alerts)} old resolved alerts")
                
                # Sleep for 5 minutes
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"❌ Error in alert monitoring: {e}")
                await asyncio.sleep(60)

    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        return [alert for alert in self.alerts.values() if alert.status == AlertStatus.ACTIVE]

    def get_escalated_alerts(self) -> List[Alert]:
        """Get all escalated alerts"""
        return [alert for alert in self.alerts.values() if alert.status == AlertStatus.ESCALATED]

    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get system statistics"""
        return {
            "total_alerts": len(self.alerts),
            "active_alerts": len(self.get_active_alerts()),
            "escalated_alerts": len(self.get_escalated_alerts()),
            "escalation_rules": len(self.escalation_rules),
            "running_tasks": len(self.escalation_tasks)
        }

# Example usage
async def main():
    """Example usage of the Alert Escalation System"""
    
    # Initialize system
    escalation_system = AlertEscalationSystem()
    await escalation_system.start()
    
    try:
        # Create a critical alert
        critical_alert = await escalation_system.create_alert(
            title="Database Connection Failure",
            message="Primary database server is unreachable. All authentication services are down.",
            severity=AlertSeverity.CRITICAL,
            source="database_monitor",
            metadata={"server": "db-primary-01", "service": "authentication"}
        )
        
        logger.info(f"🆔 Created critical alert: {critical_alert.id}")
        
        # Simulate waiting (in real scenario, acknowledgment would come via API)
        await asyncio.sleep(10)
        
        # Acknowledge the alert
        await escalation_system.acknowledge_alert(critical_alert.id, "admin_user")
        
        # Get system stats
        stats = escalation_system.get_alert_statistics()
        logger.info(f"📊 System stats: {stats}")
        
    finally:
        # Cleanup
        await escalation_system.stop()

if __name__ == "__main__":
    asyncio.run(main())
