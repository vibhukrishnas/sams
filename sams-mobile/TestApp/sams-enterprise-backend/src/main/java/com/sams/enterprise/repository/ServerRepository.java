package com.sams.enterprise.repository;

import com.sams.enterprise.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Enterprise Server Repository with Advanced Queries
 */
@Repository
public interface ServerRepository extends JpaRepository<Server, Long> {

    Optional<Server> findByHostname(String hostname);
    
    Optional<Server> findByIpAddress(String ipAddress);
    
    List<Server> findByStatus(Server.ServerStatus status);
    
    List<Server> findByEnvironment(String environment);
    
    List<Server> findByType(Server.ServerType type);
    
    List<Server> findByMonitoringEnabled(Boolean monitoringEnabled);
    
    @Query("SELECT s FROM Server s WHERE s.lastHeartbeat < :threshold")
    List<Server> findServersWithStaleHeartbeat(@Param("threshold") LocalDateTime threshold);
    
    @Query("SELECT s FROM Server s WHERE s.lastHeartbeat IS NULL OR s.lastHeartbeat < :threshold")
    List<Server> findOfflineServers(@Param("threshold") LocalDateTime threshold);
    
    @Query("SELECT s FROM Server s WHERE s.healthScore < :threshold")
    List<Server> findUnhealthyServers(@Param("threshold") Double threshold);
    
    @Query("SELECT COUNT(s) FROM Server s WHERE s.status = :status")
    long countByStatus(@Param("status") Server.ServerStatus status);
    
    @Query("SELECT COUNT(s) FROM Server s WHERE s.environment = :environment")
    long countByEnvironment(@Param("environment") String environment);
    
    @Query("SELECT s.environment, COUNT(s) FROM Server s GROUP BY s.environment")
    List<Object[]> getServerCountsByEnvironment();
    
    @Query("SELECT s.type, COUNT(s) FROM Server s GROUP BY s.type")
    List<Object[]> getServerCountsByType();
    
    @Query("SELECT s.status, COUNT(s) FROM Server s GROUP BY s.status")
    List<Object[]> getServerCountsByStatus();
    
    @Query("SELECT AVG(s.healthScore) FROM Server s WHERE s.healthScore IS NOT NULL")
    Double getAverageHealthScore();
    
    @Query("SELECT s FROM Server s WHERE s.tags[:key] = :value")
    List<Server> findByTag(@Param("key") String key, @Param("value") String value);
    
    @Query("SELECT s FROM Server s WHERE s.operatingSystem LIKE %:os%")
    List<Server> findByOperatingSystemContaining(@Param("os") String os);
    
    @Query("SELECT COUNT(s) FROM Server s WHERE s.createdAt >= :since")
    long countServersAddedSince(@Param("since") LocalDateTime since);

    org.springframework.data.domain.Page<Server> findByEnvironmentAndStatus(String environment, Server.ServerStatus status, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Server> findByEnvironment(String environment, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Server> findByStatus(Server.ServerStatus status, org.springframework.data.domain.Pageable pageable);
}
