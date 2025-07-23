# 🚀 **SAMS AUTOMATED MONITORING & NOTIFICATIONS SYSTEM**

## 📊 **System Overview**

This PowerShell script sets up automated monitoring and notifications for the SAMS (Server and Application Monitoring System) with advanced alerting, email notifications, and system health checks.

## 🎯 **Features**

- **Real-time System Monitoring** - CPU, Memory, Disk, Network
- **Automated Email Alerts** - Critical system notifications
- **Performance History** - Long-term trend analysis
- **Health Score Calculation** - Overall system wellness rating
- **Automated Cleanup Triggers** - Self-healing capabilities
- **Dashboard Generation** - HTML reports with charts
- **Windows Event Log Integration** - System logging

## 💡 **Quick Start**

```powershell
# Run the automated monitoring system
.\automated-monitoring.ps1

# Or run with custom configuration
.\automated-monitoring.ps1 -MonitoringInterval 30 -EmailEnabled $true -EmailTo "admin@company.com"
```

## 📋 **System Requirements**

- Windows 10/11 or Windows Server 2016+
- PowerShell 5.1 or later
- SMTP server access (for email notifications)
- Minimum 4GB RAM recommended
- 1GB free disk space

## ⚙️ **Configuration Options**

| Parameter | Default | Description |
|-----------|---------|-------------|
| MonitoringInterval | 60 | Seconds between system checks |
| EmailEnabled | $false | Enable email notifications |
| EmailTo | "" | Recipient email address |
| SMTPServer | "smtp.gmail.com" | SMTP server address |
| SMTPPort | 587 | SMTP server port |
| LogPath | ".\logs" | Log file directory |
| ReportPath | ".\reports" | HTML report directory |

---

*SAMS Enhanced Monitoring v2.0*
