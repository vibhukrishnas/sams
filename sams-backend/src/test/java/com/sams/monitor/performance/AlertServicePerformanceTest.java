package com.sams.monitor.performance;

import com.sams.monitor.dto.AlertDTO;
import com.sams.monitor.entity.Alert;
import com.sams.monitor.entity.Server;
import com.sams.monitor.entity.User;
import com.sams.monitor.enums.AlertSeverity;
import com.sams.monitor.enums.AlertStatus;
import com.sams.monitor.enums.ServerType;
import com.sams.monitor.repository.AlertRepository;
import com.sams.monitor.repository.ServerRepository;
import com.sams.monitor.repository.UserRepository;
import com.sams.monitor.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StopWatch;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AlertServicePerformanceTest {

    @Autowired
    private AlertService alertService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private UserRepository userRepository;

    private Server testServer;
    private User testUser;
    private List<Alert> testAlerts;

    private static final int LARGE_DATASET_SIZE = 10000;
    private static final int CONCURRENT_USERS = 50;
    private static final int OPERATIONS_PER_USER = 20;

    @BeforeEach
    void setUp() {
        // Clean up
        alertRepository.deleteAll();
        serverRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
                .username("perfuser")
                .email("perf@example.com")
                .password("$2a$10$encrypted.password")
                .role("ADMIN")
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);

        // Create test server
        testServer = Server.builder()
                .name("Performance Test Server")
                .ipAddress("192.168.1.100")
                .port(22)
                .type(ServerType.LINUX)
                .description("Server for performance testing")
                .createdAt(LocalDateTime.now())
                .build();
        testServer = serverRepository.save(testServer);

        // Create test alerts
        testAlerts = new ArrayList<>();
    }

    @Test
    void createAlert_PerformanceTest() {
        // Given
        AlertDTO alertDTO = AlertDTO.builder()
                .title("Performance Test Alert")
                .description("Alert for performance testing")
                .severity(AlertSeverity.WARNING)
                .serverId(testServer.getId())
                .build();

        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        for (int i = 0; i < 1000; i++) {
            alertDTO.setTitle("Performance Test Alert " + i);
            alertService.createAlert(alertDTO);
        }
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        double averageTime = totalTime / 1000.0;
        
        System.out.println("Created 1000 alerts in " + totalTime + "ms");
        System.out.println("Average time per alert: " + averageTime + "ms");
        
        // Performance assertion: should create alerts in reasonable time
        assertThat(averageTime).isLessThan(50.0); // Less than 50ms per alert
        assertThat(alertRepository.count()).isEqualTo(1000);
    }

    @Test
    void getAlerts_LargeDatasetPerformanceTest() {
        // Given - Create large dataset
        createLargeAlertDataset();
        
        Pageable pageable = PageRequest.of(0, 100);
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        for (int i = 0; i < 100; i++) {
            Page<Alert> alerts = alertService.getAlerts(pageable);
            assertThat(alerts.getContent()).isNotEmpty();
        }
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        double averageTime = totalTime / 100.0;
        
        System.out.println("Retrieved 100 pages of alerts in " + totalTime + "ms");
        System.out.println("Average time per page: " + averageTime + "ms");
        
        // Performance assertion: should retrieve pages quickly even with large dataset
        assertThat(averageTime).isLessThan(100.0); // Less than 100ms per page
    }

    @Test
    void acknowledgeAlert_ConcurrentPerformanceTest() throws InterruptedException {
        // Given - Create alerts for concurrent testing
        List<Alert> alerts = createAlertsForConcurrentTesting(CONCURRENT_USERS * OPERATIONS_PER_USER);
        
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENT_USERS);
        CountDownLatch latch = new CountDownLatch(CONCURRENT_USERS);
        List<Future<Long>> futures = new ArrayList<>();
        
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        
        for (int i = 0; i < CONCURRENT_USERS; i++) {
            final int userIndex = i;
            Future<Long> future = executor.submit(() -> {
                long userStartTime = System.currentTimeMillis();
                
                for (int j = 0; j < OPERATIONS_PER_USER; j++) {
                    int alertIndex = userIndex * OPERATIONS_PER_USER + j;
                    if (alertIndex < alerts.size()) {
                        Alert alert = alerts.get(alertIndex);
                        alertService.acknowledgeAlert(alert.getId(), testUser, "Concurrent test acknowledge");
                    }
                }
                
                latch.countDown();
                return System.currentTimeMillis() - userStartTime;
            });
            futures.add(future);
        }
        
        latch.await(30, TimeUnit.SECONDS);
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        int totalOperations = CONCURRENT_USERS * OPERATIONS_PER_USER;
        double averageTime = totalTime / (double) totalOperations;
        
        System.out.println("Acknowledged " + totalOperations + " alerts concurrently in " + totalTime + "ms");
        System.out.println("Average time per acknowledgment: " + averageTime + "ms");
        
        // Performance assertion
        assertThat(averageTime).isLessThan(200.0); // Less than 200ms per acknowledgment
        
        // Verify all alerts were acknowledged
        long acknowledgedCount = alertRepository.countByStatus(AlertStatus.ACKNOWLEDGED);
        assertThat(acknowledgedCount).isEqualTo(totalOperations);
        
        executor.shutdown();
    }

    @Test
    void bulkAcknowledgeAlerts_PerformanceTest() {
        // Given
        List<Alert> alerts = createAlertsForConcurrentTesting(5000);
        List<UUID> alertIds = alerts.stream().map(Alert::getId).toList();
        
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        List<Alert> acknowledgedAlerts = alertService.bulkAcknowledgeAlerts(alertIds, testUser, "Bulk performance test");
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        double averageTime = totalTime / 5000.0;
        
        System.out.println("Bulk acknowledged 5000 alerts in " + totalTime + "ms");
        System.out.println("Average time per alert: " + averageTime + "ms");
        
        // Performance assertion: bulk operations should be much faster than individual
        assertThat(averageTime).isLessThan(5.0); // Less than 5ms per alert in bulk
        assertThat(acknowledgedAlerts).hasSize(5000);
    }

    @Test
    void getAlertStatistics_PerformanceTest() {
        // Given
        createLargeAlertDataset();
        
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        for (int i = 0; i < 100; i++) {
            var stats = alertService.getAlertStatistics();
            assertThat(stats).isNotNull();
        }
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        double averageTime = totalTime / 100.0;
        
        System.out.println("Retrieved statistics 100 times in " + totalTime + "ms");
        System.out.println("Average time per statistics call: " + averageTime + "ms");
        
        // Performance assertion
        assertThat(averageTime).isLessThan(50.0); // Less than 50ms per statistics call
    }

    @Test
    void searchAlerts_PerformanceTest() {
        // Given
        createLargeAlertDataset();
        
        Pageable pageable = PageRequest.of(0, 50);
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        for (int i = 0; i < 50; i++) {
            Page<Alert> criticalAlerts = alertService.getAlertsBySeverity(AlertSeverity.CRITICAL, pageable);
            Page<Alert> warningAlerts = alertService.getAlertsBySeverity(AlertSeverity.WARNING, pageable);
            Page<Alert> activeAlerts = alertService.getAlertsByStatus(AlertStatus.ACTIVE, pageable);
            
            assertThat(criticalAlerts.getContent()).isNotEmpty();
            assertThat(warningAlerts.getContent()).isNotEmpty();
            assertThat(activeAlerts.getContent()).isNotEmpty();
        }
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        double averageTime = totalTime / 150.0; // 50 iterations * 3 queries each
        
        System.out.println("Performed 150 filtered searches in " + totalTime + "ms");
        System.out.println("Average time per search: " + averageTime + "ms");
        
        // Performance assertion
        assertThat(averageTime).isLessThan(100.0); // Less than 100ms per search
    }

    @Test
    void memoryUsage_LargeDatasetTest() {
        // Given
        Runtime runtime = Runtime.getRuntime();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();
        
        // When
        createLargeAlertDataset();
        
        // Force garbage collection
        System.gc();
        Thread.yield();
        
        long finalMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryUsed = finalMemory - initialMemory;
        
        // Then
        System.out.println("Memory used for " + LARGE_DATASET_SIZE + " alerts: " + (memoryUsed / 1024 / 1024) + " MB");
        
        // Memory assertion: should not use excessive memory
        long maxMemoryMB = 500; // 500MB max for large dataset
        assertThat(memoryUsed / 1024 / 1024).isLessThan(maxMemoryMB);
    }

    @Test
    void databaseConnection_StressTest() throws InterruptedException {
        // Given
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch latch = new CountDownLatch(20);
        List<Exception> exceptions = new CopyOnWriteArrayList<>();
        
        StopWatch stopWatch = new StopWatch();

        // When
        stopWatch.start();
        
        for (int i = 0; i < 20; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        AlertDTO alertDTO = AlertDTO.builder()
                                .title("Stress Test Alert " + j)
                                .description("Database stress test")
                                .severity(AlertSeverity.INFO)
                                .serverId(testServer.getId())
                                .build();
                        alertService.createAlert(alertDTO);
                    }
                } catch (Exception e) {
                    exceptions.add(e);
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await(60, TimeUnit.SECONDS);
        stopWatch.stop();

        // Then
        long totalTime = stopWatch.getTotalTimeMillis();
        System.out.println("Database stress test completed in " + totalTime + "ms");
        System.out.println("Exceptions encountered: " + exceptions.size());
        
        // Performance assertion
        assertThat(exceptions).isEmpty(); // No database connection issues
        assertThat(totalTime).isLessThan(30000); // Complete within 30 seconds
        assertThat(alertRepository.count()).isEqualTo(2000); // 20 threads * 100 alerts each
        
        executor.shutdown();
    }

    private void createLargeAlertDataset() {
        System.out.println("Creating large dataset of " + LARGE_DATASET_SIZE + " alerts...");
        
        List<Alert> alerts = IntStream.range(0, LARGE_DATASET_SIZE)
                .parallel()
                .mapToObj(i -> Alert.builder()
                        .title("Large Dataset Alert " + i)
                        .description("Alert " + i + " for performance testing")
                        .severity(AlertSeverity.values()[i % AlertSeverity.values().length])
                        .status(AlertStatus.values()[i % AlertStatus.values().length])
                        .server(testServer)
                        .createdAt(LocalDateTime.now().minusMinutes(i % 1440)) // Spread over 24 hours
                        .build())
                .toList();
        
        // Batch save for better performance
        alertRepository.saveAll(alerts);
        
        System.out.println("Large dataset created successfully");
    }

    private List<Alert> createAlertsForConcurrentTesting(int count) {
        List<Alert> alerts = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            Alert alert = Alert.builder()
                    .title("Concurrent Test Alert " + i)
                    .description("Alert " + i + " for concurrent testing")
                    .severity(AlertSeverity.WARNING)
                    .status(AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now().minusMinutes(i % 60))
                    .build();
            alerts.add(alert);
        }
        
        return alertRepository.saveAll(alerts);
    }
}
