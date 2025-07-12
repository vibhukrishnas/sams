package com.sams.monitoring;

import com.sams.monitoring.model.SystemMetrics;
import com.sams.monitoring.service.SystemMetricsService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test class for SystemMetricsService
 * 
 * Tests the core functionality of system metrics collection
 */
@SpringBootTest
@SpringJUnitConfig
public class SystemMetricsServiceTest {

    @Test
    public void testSystemMetricsCollection() {
        SystemMetricsService service = new SystemMetricsService();
        SystemMetrics metrics = service.collectMetrics();
        
        // Verify basic metrics are collected
        assertNotNull(metrics);
        assertNotNull(metrics.getTimestamp());
        assertNotNull(metrics.getHostname());
        
        // Verify CPU metrics
        assertNotNull(metrics.getCpuUsage());
        assertTrue(metrics.getCpuUsage() >= 0 && metrics.getCpuUsage() <= 100);
        assertNotNull(metrics.getCpuCores());
        assertTrue(metrics.getCpuCores() > 0);
        
        // Verify memory metrics
        assertNotNull(metrics.getMemoryUsage());
        assertTrue(metrics.getMemoryUsage() >= 0 && metrics.getMemoryUsage() <= 100);
        assertNotNull(metrics.getTotalMemory());
        assertTrue(metrics.getTotalMemory() > 0);
        
        // Verify disk metrics
        assertNotNull(metrics.getDiskUsage());
        assertTrue(metrics.getDiskUsage() >= 0 && metrics.getDiskUsage() <= 100);
        assertNotNull(metrics.getTotalDisk());
        assertTrue(metrics.getTotalDisk() > 0);
        
        // Verify health score calculation
        assertNotNull(metrics.getHealthScore());
        assertTrue(metrics.getHealthScore() >= 0 && metrics.getHealthScore() <= 100);
        
        // Verify system status
        assertNotNull(metrics.getSystemStatus());
        assertTrue(metrics.getSystemStatus().matches("EXCELLENT|GOOD|WARNING|CRITICAL"));
        
        System.out.println("Test Results:");
        System.out.println("=============");
        System.out.println("Hostname: " + metrics.getHostname());
        System.out.println("CPU Usage: " + metrics.getCpuUsage() + "%");
        System.out.println("Memory Usage: " + metrics.getMemoryUsage() + "%");
        System.out.println("Disk Usage: " + metrics.getDiskUsage() + "%");
        System.out.println("Health Score: " + metrics.getHealthScore());
        System.out.println("System Status: " + metrics.getSystemStatus());
        System.out.println("OS: " + metrics.getOperatingSystem());
    }

    @Test
    public void testHealthScoreCalculation() {
        SystemMetrics metrics = new SystemMetrics();
        
        // Test excellent health (low usage)
        metrics.setCpuUsage(10.0);
        metrics.setMemoryUsage(20.0);
        metrics.setDiskUsage(15.0);
        
        Double healthScore = metrics.getHealthScore();
        assertNotNull(healthScore);
        assertTrue(healthScore > 80); // Should be high score
        assertEquals("EXCELLENT", metrics.getSystemStatus());
        
        // Test critical health (high usage)
        metrics.setCpuUsage(95.0);
        metrics.setMemoryUsage(90.0);
        metrics.setDiskUsage(85.0);
        
        healthScore = metrics.getHealthScore();
        assertNotNull(healthScore);
        assertTrue(healthScore < 30); // Should be low score
        assertEquals("CRITICAL", metrics.getSystemStatus());
    }

    @Test
    public void testMultipleMetricsCollections() {
        SystemMetricsService service = new SystemMetricsService();
        
        // Collect metrics multiple times to ensure consistency
        SystemMetrics metrics1 = service.collectMetrics();
        
        try {
            Thread.sleep(1000); // Wait 1 second
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        SystemMetrics metrics2 = service.collectMetrics();
        
        // Verify both collections are successful
        assertNotNull(metrics1);
        assertNotNull(metrics2);
        
        // Verify timestamps are different
        assertNotEquals(metrics1.getTimestamp(), metrics2.getTimestamp());
        
        // Verify hostname is consistent
        assertEquals(metrics1.getHostname(), metrics2.getHostname());
        
        // CPU usage might vary slightly between collections
        assertNotNull(metrics1.getCpuUsage());
        assertNotNull(metrics2.getCpuUsage());
        
        System.out.println("Multiple Collections Test:");
        System.out.println("==========================");
        System.out.println("Collection 1 - CPU: " + metrics1.getCpuUsage() + "%, Memory: " + metrics1.getMemoryUsage() + "%");
        System.out.println("Collection 2 - CPU: " + metrics2.getCpuUsage() + "%, Memory: " + metrics2.getMemoryUsage() + "%");
    }
}
