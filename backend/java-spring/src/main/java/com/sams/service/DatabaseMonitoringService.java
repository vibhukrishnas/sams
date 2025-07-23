package com.sams.service;

import com.sams.model.SystemMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Database Monitoring Service
 * Monitors database connections, connection pools, and database health
 */
@Service
@Slf4j
public class DatabaseMonitoringService {

    @Autowired
    private DataSource dataSource;

    /**
     * Get database connection metrics
     */
    public SystemMetrics.DatabaseMetrics getDatabaseMetrics() {
        SystemMetrics.DatabaseMetrics.DatabaseMetricsBuilder builder = SystemMetrics.DatabaseMetrics.builder();
        
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            
            long startTime = System.currentTimeMillis();
            boolean connected = !connection.isClosed();
            long connectionTime = System.currentTimeMillis() - startTime;
            
            Map<String, Object> details = new HashMap<>();
            details.put("databaseProductName", metaData.getDatabaseProductName());
            details.put("databaseProductVersion", metaData.getDatabaseProductVersion());
            details.put("driverName", metaData.getDriverName());
            details.put("driverVersion", metaData.getDriverVersion());
            details.put("autoCommit", connection.getAutoCommit());
            details.put("readOnly", connection.isReadOnly());
            details.put("transactionIsolation", connection.getTransactionIsolation());
            
            // Get table count
            try (ResultSet tables = metaData.getTables(null, null, null, new String[]{"TABLE"})) {
                int tableCount = 0;
                while (tables.next()) {
                    tableCount++;
                }
                details.put("tableCount", tableCount);
            }
            
            // Connection pool information (if available)
            details.putAll(getConnectionPoolInfo());
            
            return builder
                    .url(metaData.getURL())
                    .driver(metaData.getDriverName())
                    .connected(connected)
                    .activeConnections(getActiveConnections())
                    .maxConnections(getMaxConnections())
                    .connectionTime(connectionTime)
                    .status(connected ? "HEALTHY" : "DISCONNECTED")
                    .details(details)
                    .lastCheck(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            log.error("Error getting database metrics: {}", e.getMessage());
            
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("error", e.getMessage());
            errorDetails.put("errorType", e.getClass().getSimpleName());
            
            return builder
                    .url("unknown")
                    .driver("unknown")
                    .connected(false)
                    .activeConnections(0)
                    .maxConnections(0)
                    .connectionTime(0L)
                    .status("ERROR: " + e.getMessage())
                    .details(errorDetails)
                    .lastCheck(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Test database connectivity
     */
    public boolean testDatabaseConnection() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(5); // 5 second timeout
        } catch (Exception e) {
            log.error("Database connection test failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Get database health information
     */
    public Map<String, Object> getDatabaseHealth() {
        Map<String, Object> health = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            health.put("status", "UP");
            health.put("database", connection.getMetaData().getDatabaseProductName());
            health.put("validationQuery", "SELECT 1");
            
            // Test a simple query
            long startTime = System.currentTimeMillis();
            try (var stmt = connection.createStatement(); var rs = stmt.executeQuery("SELECT 1")) {
                if (rs.next()) {
                    health.put("queryTime", System.currentTimeMillis() - startTime);
                    health.put("queryResult", rs.getInt(1));
                }
            }
            
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("error", e.getMessage());
        }
        
        return health;
    }

    private int getActiveConnections() {
        // This would depend on the connection pool implementation
        // For now, return 1 if connected, 0 if not
        try (Connection connection = dataSource.getConnection()) {
            return connection.isClosed() ? 0 : 1;
        } catch (Exception e) {
            return 0;
        }
    }

    private int getMaxConnections() {
        // This would depend on the connection pool implementation
        // Default to a reasonable number for demo purposes
        return 10;
    }

    private Map<String, Object> getConnectionPoolInfo() {
        Map<String, Object> poolInfo = new HashMap<>();
        
        // Try to get HikariCP metrics if available
        try {
            if (dataSource.getClass().getName().contains("Hikari")) {
                // HikariCP specific metrics would go here
                poolInfo.put("poolType", "HikariCP");
            } else if (dataSource.getClass().getName().contains("Tomcat")) {
                // Tomcat JDBC Pool specific metrics would go here
                poolInfo.put("poolType", "Tomcat JDBC Pool");
            } else {
                poolInfo.put("poolType", "Unknown");
            }
            
            poolInfo.put("dataSourceClass", dataSource.getClass().getSimpleName());
            
        } catch (Exception e) {
            log.debug("Could not determine connection pool type: {}", e.getMessage());
            poolInfo.put("poolType", "Unknown");
        }
        
        return poolInfo;
    }

    /**
     * Execute a custom database health check query
     */
    public Map<String, Object> executeHealthCheck(String query) {
        Map<String, Object> result = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection();
             var stmt = connection.createStatement()) {
            
            long startTime = System.currentTimeMillis();
            
            if (query.trim().toUpperCase().startsWith("SELECT")) {
                try (ResultSet rs = stmt.executeQuery(query)) {
                    long executionTime = System.currentTimeMillis() - startTime;
                    
                    result.put("status", "SUCCESS");
                    result.put("executionTime", executionTime);
                    result.put("hasResults", rs.next());
                    
                    // Get column count
                    int columnCount = rs.getMetaData().getColumnCount();
                    result.put("columnCount", columnCount);
                }
            } else {
                int updateCount = stmt.executeUpdate(query);
                long executionTime = System.currentTimeMillis() - startTime;
                
                result.put("status", "SUCCESS");
                result.put("executionTime", executionTime);
                result.put("updateCount", updateCount);
            }
            
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
        }
        
        return result;
    }
}
