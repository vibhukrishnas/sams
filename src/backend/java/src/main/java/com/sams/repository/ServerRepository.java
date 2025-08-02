package com.sams.repository;

import com.sams.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Server Repository for database operations
 */
@Repository
public interface ServerRepository extends JpaRepository<Server, Long> {
    
    /**
     * Find server by name
     */
    Optional<Server> findByName(String name);
    
    /**
     * Find servers by host
     */
    List<Server> findByHost(String host);
    
    /**
     * Find servers by status
     */
    List<Server> findByStatus(Server.ServerStatus status);
    
    /**
     * Count servers by status
     */
    long countByStatus(Server.ServerStatus status);
    
    /**
     * Find servers by server type
     */
    List<Server> findByServerType(String serverType);
    
    /**
     * Find servers that haven't been checked recently
     */
    @Query("SELECT s FROM Server s WHERE s.lastCheck < :threshold OR s.lastCheck IS NULL")
    List<Server> findServersNotCheckedSince(@Param("threshold") LocalDateTime threshold);
    
    /**
     * Find servers with high CPU usage
     */
    @Query("SELECT s FROM Server s WHERE s.cpuUsage > :threshold")
    List<Server> findServersWithHighCpuUsage(@Param("threshold") Double threshold);
    
    /**
     * Find servers with high memory usage
     */
    @Query("SELECT s FROM Server s WHERE s.memoryUsage > :threshold")
    List<Server> findServersWithHighMemoryUsage(@Param("threshold") Double threshold);
    
    /**
     * Get server statistics
     */
    @Query("SELECT COUNT(s), s.status FROM Server s GROUP BY s.status")
    List<Object[]> getServerStatusStatistics();
    
    /**
     * Find servers by name containing (case insensitive)
     */
    List<Server> findByNameContainingIgnoreCase(String name);
    
    /**
     * Check if server exists by host and port
     */
    boolean existsByHostAndPort(String host, Integer port);
}
