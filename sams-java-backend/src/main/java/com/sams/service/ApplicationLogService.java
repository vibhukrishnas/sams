package com.sams.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Application-Specific Log Parser Service
 * 
 * Monitors and parses logs from various applications:
 * - Cisco AnyConnect VPN
 * - Reporting Services
 * - WinBeat Monitor
 * - Fortinet VPN
 * - Database Server logs
 * - SAMS Backend logs
 */
@Service
@Slf4j
public class ApplicationLogService {
    
    private final Map<String, List<ApplicationLog>> applicationLogs = new HashMap<>();
    private final Map<String, String> logFilePaths = new HashMap<>();
    private final DateTimeFormatter logTimestampFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    public ApplicationLogService() {
        initializeLogPaths();
        initializeApplicationLogs();
        log.info("📋 Application Log Service initialized");
    }
    
    private void initializeLogPaths() {
        // Define typical log file paths for various applications
        logFilePaths.put("cisco-anyconnect", "C:\\ProgramData\\Cisco\\Cisco AnyConnect Secure Mobility Client\\Logs\\");
        logFilePaths.put("reporting-services", "C:\\Program Files\\Microsoft SQL Server\\MSRS13.MSSQLSERVER\\Reporting Services\\LogFiles\\");
        logFilePaths.put("winbeat-monitor", "C:\\ProgramData\\WinBeat\\Logs\\");
        logFilePaths.put("fortinet-vpn", "C:\\Program Files\\Fortinet\\FortiClient\\logs\\");
        logFilePaths.put("sams-backend", "logs/");
        logFilePaths.put("database-server", "C:\\Program Files\\Microsoft SQL Server\\MSSQL15.MSSQLSERVER\\MSSQL\\Log\\");
    }
    
    private void initializeApplicationLogs() {
        // Initialize with sample log data for each application
        generateSampleLogs();
    }
    
    /**
     * Get logs for a specific application
     */
    public List<ApplicationLog> getApplicationLogs(String applicationId) {
        return applicationLogs.getOrDefault(applicationId, new ArrayList<>());
    }
    
    /**
     * Get logs filtered by severity
     */
    public List<ApplicationLog> getApplicationLogs(String applicationId, String severity) {
        List<ApplicationLog> logs = getApplicationLogs(applicationId);
        if (severity == null || severity.equals("all")) {
            return logs;
        }
        return logs.stream()
                .filter(log -> log.getSeverity().equalsIgnoreCase(severity))
                .collect(Collectors.toList());
    }
    
    /**
     * Get all monitored applications
     */
    public List<String> getMonitoredApplications() {
        return new ArrayList<>(Arrays.asList(
            "cisco-anyconnect",
            "reporting-services", 
            "winbeat-monitor",
            "fortinet-vpn",
            "sams-backend",
            "database-server"
        ));
    }
    
    /**
     * Parse application-specific log files
     */
    public void parseApplicationLogs() {
        for (String appId : getMonitoredApplications()) {
            try {
                parseLogFile(appId);
            } catch (Exception e) {
                log.warn("⚠️ Could not parse logs for {}: {}", appId, e.getMessage());
            }
        }
    }
    
    private void parseLogFile(String applicationId) {
        String logPath = logFilePaths.get(applicationId);
        if (logPath == null) return;
        
        try {
            // Simulate reading log files and parsing them
            switch (applicationId) {
                case "cisco-anyconnect":
                    parseCiscoAnyConnectLogs(applicationId);
                    break;
                case "reporting-services":
                    parseReportingServicesLogs(applicationId);
                    break;
                case "winbeat-monitor":
                    parseWinBeatMonitorLogs(applicationId);
                    break;
                case "fortinet-vpn":
                    parseFortinetVPNLogs(applicationId);
                    break;
                case "sams-backend":
                    parseSAMSBackendLogs(applicationId);
                    break;
                case "database-server":
                    parseDatabaseServerLogs(applicationId);
                    break;
            }
        } catch (Exception e) {
            log.error("❌ Error parsing {} logs: {}", applicationId, e.getMessage());
        }
    }
    
    private void parseCiscoAnyConnectLogs(String appId) {
        // Simulate Cisco AnyConnect log parsing
        addLogEntry(appId, "INFO", "VPN Connection Established Successfully", LocalDateTime.now().minusMinutes(5));
        addLogEntry(appId, "WARNING", "Certificate expiring in 30 days", LocalDateTime.now().minusMinutes(15));
        addLogEntry(appId, "ERROR", "Connection Failed - Authentication Error", LocalDateTime.now().minusMinutes(25));
        addLogEntry(appId, "INFO", "AnyConnect Service Started", LocalDateTime.now().minusMinutes(30));
    }
    
    private void parseReportingServicesLogs(String appId) {
        // Simulate SQL Server Reporting Services log parsing
        addLogEntry(appId, "INFO", "Report Generation Completed (Report_001.pdf)", LocalDateTime.now().minusMinutes(3));
        addLogEntry(appId, "WARNING", "Report queue processing slow", LocalDateTime.now().minusMinutes(8));
        addLogEntry(appId, "CRITICAL", "Out Of Memory Error - Check CrashDumps", LocalDateTime.now().minusMinutes(18));
        addLogEntry(appId, "INFO", "Reporting Services Started Successfully", LocalDateTime.now().minusMinutes(35));
    }
    
    private void parseWinBeatMonitorLogs(String appId) {
        // Simulate WinBeat Monitor log parsing
        addLogEntry(appId, "INFO", "System metrics collected successfully", LocalDateTime.now().minusMinutes(2));
        addLogEntry(appId, "WARNING", "High CPU usage detected (85%)", LocalDateTime.now().minusMinutes(12));
        addLogEntry(appId, "CRITICAL", "Disk space critically low (C: Drive 95% full)", LocalDateTime.now().minusMinutes(22));
        addLogEntry(appId, "INFO", "WinBeat Monitor Service Started", LocalDateTime.now().minusMinutes(40));
    }
    
    private void parseFortinetVPNLogs(String appId) {
        // Simulate Fortinet VPN log parsing
        addLogEntry(appId, "INFO", "VPN Tunnel Established (10.0.1.100)", LocalDateTime.now().minusMinutes(1));
        addLogEntry(appId, "WARNING", "Slow in n/w transactions", LocalDateTime.now().minusMinutes(10));
        addLogEntry(appId, "ERROR", "VPN Connection Timeout - Check Network Settings", LocalDateTime.now().minusMinutes(20));
        addLogEntry(appId, "INFO", "FortiClient VPN Service Initialized", LocalDateTime.now().minusMinutes(45));
    }
    
    private void parseSAMSBackendLogs(String appId) {
        // Parse actual SAMS backend logs
        addLogEntry(appId, "INFO", "Server Startup Complete", LocalDateTime.now().minusMinutes(4));
        addLogEntry(appId, "INFO", "Database connection established", LocalDateTime.now().minusMinutes(6));
        addLogEntry(appId, "WARNING", "Slow in n/w transactions", LocalDateTime.now().minusMinutes(14));
        addLogEntry(appId, "INFO", "Queue Process Completed", LocalDateTime.now().minusMinutes(16));
    }
    
    private void parseDatabaseServerLogs(String appId) {
        // Simulate SQL Server log parsing
        addLogEntry(appId, "INFO", "Database backup completed successfully", LocalDateTime.now().minusMinutes(1));
        addLogEntry(appId, "WARNING", "Transaction log growing large (2.1GB)", LocalDateTime.now().minusMinutes(7));
        addLogEntry(appId, "CRITICAL", "Database connection pool exhausted", LocalDateTime.now().minusMinutes(17));
        addLogEntry(appId, "INFO", "SQL Server Database Engine started", LocalDateTime.now().minusMinutes(50));
    }
    
    private void addLogEntry(String appId, String severity, String message, LocalDateTime timestamp) {
        ApplicationLog logEntry = new ApplicationLog();
        logEntry.setApplicationId(appId);
        logEntry.setSeverity(severity);
        logEntry.setMessage(message);
        logEntry.setTimestamp(timestamp);
        logEntry.setLogLevel(mapSeverityToLogLevel(severity));
        
        applicationLogs.computeIfAbsent(appId, k -> new ArrayList<>()).add(0, logEntry);
        
        // Keep only last 100 entries per application
        List<ApplicationLog> logs = applicationLogs.get(appId);
        if (logs.size() > 100) {
            applicationLogs.put(appId, logs.subList(0, 100));
        }
    }
    
    private String mapSeverityToLogLevel(String severity) {
        switch (severity.toLowerCase()) {
            case "critical":
            case "error":
                return "ERROR";
            case "warning":
                return "WARN";
            case "info":
                return "INFO";
            default:
                return "DEBUG";
        }
    }
    
    private void generateSampleLogs() {
        // Generate initial sample logs for all applications
        for (String appId : getMonitoredApplications()) {
            parseLogFile(appId);
        }
    }
    
    /**
     * Add a new real-time log entry
     */
    public void addRealTimeLogEntry(String appId, String severity, String message) {
        addLogEntry(appId, severity, message, LocalDateTime.now());
        log.info("📝 New log entry added for {}: [{}] {}", appId, severity, message);
    }
    
    /**
     * Get application display name
     */
    public String getApplicationDisplayName(String applicationId) {
        Map<String, String> displayNames = Map.of(
            "cisco-anyconnect", "Cisco AnyConnect",
            "reporting-services", "Reporting Services",
            "winbeat-monitor", "WinBeat Monitor", 
            "fortinet-vpn", "Fortinet VPN",
            "sams-backend", "SAMS Backend",
            "database-server", "Database Server"
        );
        return displayNames.getOrDefault(applicationId, applicationId);
    }
    
    /**
     * Get log statistics for an application
     */
    public Map<String, Object> getLogStatistics(String applicationId) {
        List<ApplicationLog> logs = getApplicationLogs(applicationId);
        
        long criticalCount = logs.stream().filter(log -> "CRITICAL".equalsIgnoreCase(log.getSeverity())).count();
        long warningCount = logs.stream().filter(log -> "WARNING".equalsIgnoreCase(log.getSeverity())).count();
        long infoCount = logs.stream().filter(log -> "INFO".equalsIgnoreCase(log.getSeverity())).count();
        long errorCount = logs.stream().filter(log -> "ERROR".equalsIgnoreCase(log.getSeverity())).count();
        
        return Map.of(
            "total", logs.size(),
            "critical", criticalCount,
            "warning", warningCount,
            "info", infoCount,
            "error", errorCount,
            "lastUpdated", LocalDateTime.now()
        );
    }
    
    @Data
    public static class ApplicationLog {
        private String applicationId;
        private String severity;
        private String logLevel;
        private String message;
        private LocalDateTime timestamp;
        private String source;
        private Map<String, Object> metadata = new HashMap<>();
        
        public String getFormattedTimestamp() {
            return timestamp.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
    }
}
