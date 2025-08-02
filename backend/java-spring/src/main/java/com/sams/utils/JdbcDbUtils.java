package com.sams.utils;

import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.DatabaseMetaDataCallback;
import org.springframework.jdbc.support.MetaDataAccessException;

import javax.sql.DataSource;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
public class JdbcDbUtils {
    
    public static Map<String, Object> getDatabaseInfo(DataSource dataSource) {
        try {
            return extractDatabaseMetaData(dataSource, new DatabaseMetaDataCallback() {
                @Override
                public Object processMetaData(DatabaseMetaData dbmd) throws SQLException {
                    Map<String, Object> info = new HashMap<>();
                    info.put("databaseProductName", dbmd.getDatabaseProductName());
                    info.put("databaseProductVersion", dbmd.getDatabaseProductVersion());
                    info.put("driverName", dbmd.getDriverName());
                    info.put("driverVersion", dbmd.getDriverVersion());
                    info.put("maxConnections", dbmd.getMaxConnections());
                    return info;
                }
            });
        } catch (MetaDataAccessException e) {
            log.error("Error getting database metadata", e);
            return new HashMap<>();
        }
    }
    
    public static Map<String, Object> getConnectionPoolInfo(HikariDataSource dataSource) {
        Map<String, Object> info = new HashMap<>();
        info.put("activeConnections", dataSource.getHikariPoolMXBean().getActiveConnections());
        info.put("idleConnections", dataSource.getHikariPoolMXBean().getIdleConnections());
        info.put("totalConnections", dataSource.getHikariPoolMXBean().getTotalConnections());
        info.put("threadsAwaitingConnection", dataSource.getHikariPoolMXBean().getThreadsAwaitingConnection());
        return info;
    }
    
    public static boolean isTableExists(JdbcTemplate jdbcTemplate, String tableName) {
        try {
            jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName + " WHERE 1=0",
                Integer.class
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public static long getTableCount(JdbcTemplate jdbcTemplate, String tableName) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + tableName,
                Long.class
            );
        } catch (Exception e) {
            log.error("Error getting table count for " + tableName, e);
            return -1;
        }
    }
    
    public static boolean testConnection(DataSource dataSource) {
        try {
            JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            log.error("Database connection test failed", e);
            return false;
        }
    }

    private static Map<String, Object> extractDatabaseMetaData(DataSource dataSource, DatabaseMetaDataCallback callback) throws MetaDataAccessException {
        try {
            DatabaseMetaData metaData = dataSource.getConnection().getMetaData();
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) callback.processMetaData(metaData);
            return result;
        } catch (SQLException e) {
            throw new MetaDataAccessException("Error accessing database metadata", e);
        }
    }
}
