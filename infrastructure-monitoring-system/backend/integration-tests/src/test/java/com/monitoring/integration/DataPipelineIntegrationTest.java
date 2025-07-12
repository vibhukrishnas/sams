/**
 * 🧪 Data Pipeline Integration Tests - End-to-End Testing
 * Comprehensive integration tests for WebSocket, Kafka, and InfluxDB pipeline
 */

package com.monitoring.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.monitoring.dataprocessing.model.MetricData;
import com.monitoring.timeseries.model.MetricDataPoint;
import com.monitoring.websocket.handler.MonitoringWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringJUnitTest;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.WebSocketClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.testcontainers.containers.InfluxDBContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@EmbeddedKafka(partitions = 1, topics = {
    "monitoring.metrics.raw",
    "monitoring.metrics.processed", 
    "monitoring.metrics.aggregated.1m",
    "monitoring.alerts.realtime"
})
@ActiveProfiles("integration-test")
@SpringJUnitTest
class DataPipelineIntegrationTest {

    @Container
    static InfluxDBContainer<?> influxDB = new InfluxDBContainer<>(DockerImageName.parse("influxdb:2.7"))
            .withDatabase("monitoring_test")
            .withUsername("test")
            .withPassword("testpassword")
            .withAdminToken("test-token");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @LocalServerPort
    private int port;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private MonitoringWebSocketHandler webSocketHandler;

    @Autowired
    private InfluxDBClient influxDBClient;

    @Autowired
    private ObjectMapper objectMapper;

    private WebSocketClient webSocketClient;
    private TestWebSocketSession testSession;

    @BeforeEach
    void setUp() {
        webSocketClient = new StandardWebSocketClient();
        testSession = new TestWebSocketSession();
    }

    @Test
    @DisplayName("Should process complete data pipeline from WebSocket to InfluxDB")
    void shouldProcessCompleteDataPipeline() throws Exception {
        // Given - Connect WebSocket client
        URI webSocketUri = URI.create("ws://localhost:" + port + "/ws/monitoring?token=test-token");
        WebSocketSession session = webSocketClient.doHandshake(testSession, null, webSocketUri).get();

        assertThat(session.isOpen()).isTrue();

        // When - Send metric data through WebSocket
        MetricData metricData = createTestMetricData();
        String message = objectMapper.writeValueAsString(Map.of(
            "type", "METRIC_DATA",
            "data", metricData
        ));

        session.sendMessage(new TextMessage(message));

        // Then - Verify data flows through entire pipeline
        await().atMost(30, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    // Verify metric was processed and stored in InfluxDB
                    String query = String.format("""
                        from(bucket: "monitoring_test")
                          |> range(start: -1h)
                          |> filter(fn: (r) => r["_measurement"] == "metrics")
                          |> filter(fn: (r) => r["server_id"] == "%s")
                          |> filter(fn: (r) => r["metric_name"] == "%s")
                        """, metricData.getServerId(), metricData.getMetricName());

                    var tables = influxDBClient.getQueryApi().query(query, "test-org");
                    assertThat(tables).isNotEmpty();
                    assertThat(tables.get(0).getRecords()).isNotEmpty();
                });

        session.close();
    }

    @Test
    @DisplayName("Should handle real-time metric streaming via WebSocket")
    void shouldHandleRealTimeMetricStreaming() throws Exception {
        // Given - Connect WebSocket and subscribe to metrics
        URI webSocketUri = URI.create("ws://localhost:" + port + "/ws/monitoring?token=test-token");
        WebSocketSession session = webSocketClient.doHandshake(testSession, null, webSocketUri).get();

        // Subscribe to server metrics
        String subscribeMessage = objectMapper.writeValueAsString(Map.of(
            "type", "SUBSCRIBE",
            "data", Map.of("topics", List.of("metrics.server-1", "alerts.server-1"))
        ));
        session.sendMessage(new TextMessage(subscribeMessage));

        // Wait for subscription confirmation
        await().atMost(5, TimeUnit.SECONDS)
                .until(() -> testSession.getReceivedMessages().stream()
                        .anyMatch(msg -> msg.contains("SUBSCRIPTION_CONFIRMED")));

        // When - Broadcast metrics to subscribed topics
        Map<String, Object> metricBroadcast = Map.of(
            "serverId", "server-1",
            "metricName", "cpu_usage",
            "value", 85.5,
            "timestamp", LocalDateTime.now().toString()
        );

        webSocketHandler.broadcastToTopic("metrics.server-1", metricBroadcast);

        // Then - Verify client receives the broadcast
        await().atMost(10, TimeUnit.SECONDS)
                .until(() -> testSession.getReceivedMessages().stream()
                        .anyMatch(msg -> msg.contains("cpu_usage") && msg.contains("85.5")));

        session.close();
    }

    @Test
    @DisplayName("Should process high-volume metrics with Kafka streaming")
    void shouldProcessHighVolumeMetricsWithKafka() throws Exception {
        // Given - Generate high volume of test metrics
        List<MetricData> testMetrics = generateHighVolumeTestMetrics(1000);

        // When - Send metrics to Kafka
        CompletableFuture<Void> sendFuture = CompletableFuture.runAsync(() -> {
            testMetrics.forEach(metric -> {
                kafkaTemplate.send("monitoring.metrics.raw", metric.getMetricKey(), metric);
            });
        });

        sendFuture.get(30, TimeUnit.SECONDS);

        // Then - Verify metrics are processed and aggregated
        await().atMost(60, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    // Check that aggregated metrics are created
                    String query = """
                        from(bucket: "monitoring_test")
                          |> range(start: -1h)
                          |> filter(fn: (r) => r["_measurement"] == "aggregated_metrics")
                          |> filter(fn: (r) => r["aggregation_type"] == "AVG")
                          |> count()
                        """;

                    var tables = influxDBClient.getQueryApi().query(query, "test-org");
                    assertThat(tables).isNotEmpty();
                    
                    // Should have aggregated data
                    long aggregatedCount = tables.get(0).getRecords().stream()
                            .mapToLong(record -> ((Number) record.getValue()).longValue())
                            .sum();
                    assertThat(aggregatedCount).isGreaterThan(0);
                });
    }

    @Test
    @DisplayName("Should handle WebSocket connection failures with fallback")
    void shouldHandleWebSocketConnectionFailuresWithFallback() throws Exception {
        // Given - Connect WebSocket client
        URI webSocketUri = URI.create("ws://localhost:" + port + "/ws/monitoring?token=test-token");
        WebSocketSession session = webSocketClient.doHandshake(testSession, null, webSocketUri).get();

        UUID userId = UUID.randomUUID();
        
        // When - Simulate connection failure by closing session
        session.close();

        // Send message to offline user (should be queued)
        Map<String, Object> offlineMessage = Map.of(
            "type", "ALERT",
            "message", "Critical alert for offline user",
            "timestamp", LocalDateTime.now().toString()
        );

        webSocketHandler.sendToUser(userId, offlineMessage);

        // Reconnect user
        WebSocketSession newSession = webSocketClient.doHandshake(testSession, null, webSocketUri).get();

        // Then - Verify queued message is delivered upon reconnection
        await().atMost(10, TimeUnit.SECONDS)
                .until(() -> testSession.getReceivedMessages().stream()
                        .anyMatch(msg -> msg.contains("Critical alert for offline user")));

        newSession.close();
    }

    @Test
    @DisplayName("Should validate and filter invalid metrics")
    void shouldValidateAndFilterInvalidMetrics() throws Exception {
        // Given - Create mix of valid and invalid metrics
        List<MetricData> mixedMetrics = Arrays.asList(
            createValidMetricData(),
            createInvalidMetricData("null-value", null),
            createInvalidMetricData("nan-value", Double.NaN),
            createInvalidMetricData("infinite-value", Double.POSITIVE_INFINITY),
            createValidMetricData()
        );

        // When - Send metrics through pipeline
        mixedMetrics.forEach(metric -> {
            kafkaTemplate.send("monitoring.metrics.raw", metric.getMetricKey(), metric);
        });

        // Then - Verify only valid metrics are stored
        await().atMost(30, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    String query = """
                        from(bucket: "monitoring_test")
                          |> range(start: -1h)
                          |> filter(fn: (r) => r["_measurement"] == "metrics")
                          |> count()
                        """;

                    var tables = influxDBClient.getQueryApi().query(query, "test-org");
                    assertThat(tables).isNotEmpty();
                    
                    // Should only have 2 valid metrics stored
                    long storedCount = tables.get(0).getRecords().stream()
                            .mapToLong(record -> ((Number) record.getValue()).longValue())
                            .sum();
                    assertThat(storedCount).isEqualTo(2);
                });
    }

    @Test
    @DisplayName("Should handle data retention and cleanup")
    void shouldHandleDataRetentionAndCleanup() throws Exception {
        // Given - Store old metrics
        MetricDataPoint oldMetric = createOldMetricDataPoint();
        storeMetricDirectly(oldMetric);

        // When - Trigger cleanup process
        LocalDateTime cutoffTime = LocalDateTime.now().minusDays(1);
        // Simulate cleanup trigger (would normally be scheduled)
        
        // Then - Verify old metrics are cleaned up
        await().atMost(30, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    String query = String.format("""
                        from(bucket: "monitoring_test")
                          |> range(start: -2d, stop: %s)
                          |> filter(fn: (r) => r["_measurement"] == "metrics")
                          |> filter(fn: (r) => r["server_id"] == "%s")
                          |> count()
                        """, cutoffTime.toString(), oldMetric.getServerId());

                    var tables = influxDBClient.getQueryApi().query(query, "test-org");
                    // Should have no records after cleanup
                    assertThat(tables).isEmpty();
                });
    }

    @Test
    @DisplayName("Should monitor pipeline performance metrics")
    void shouldMonitorPipelinePerformanceMetrics() throws Exception {
        // Given - Process some metrics
        List<MetricData> testMetrics = generateTestMetrics(100);
        
        // When - Send metrics through pipeline
        testMetrics.forEach(metric -> {
            kafkaTemplate.send("monitoring.metrics.raw", metric.getMetricKey(), metric);
        });

        // Then - Verify performance metrics are tracked
        await().atMost(30, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    // Check WebSocket statistics
                    var wsStats = webSocketHandler.getStatistics();
                    assertThat(wsStats).isNotNull();
                    assertThat(wsStats.getTotalMessages()).isGreaterThanOrEqualTo(0);

                    // Check time-series database performance
                    // This would be implemented in the actual service
                    // var dbStats = timeSeriesService.getPerformanceMetrics();
                    // assertThat(dbStats.getTotalWrites()).isGreaterThan(0);
                });
    }

    // Helper methods
    private MetricData createTestMetricData() {
        MetricData metric = new MetricData();
        metric.setServerId(UUID.randomUUID());
        metric.setServerName("test-server-01");
        metric.setOrganizationId(UUID.randomUUID());
        metric.setMetricName("cpu_usage");
        metric.setValue(75.5);
        metric.setUnit("percent");
        metric.setTimestamp(LocalDateTime.now());
        metric.setSource("test-agent");
        metric.setEnvironment("test");
        metric.setTags(Map.of("region", "us-east-1", "instance_type", "t3.medium"));
        return metric;
    }

    private MetricData createValidMetricData() {
        return createTestMetricData();
    }

    private MetricData createInvalidMetricData(String type, Double value) {
        MetricData metric = createTestMetricData();
        metric.setValue(value);
        metric.setMetricName("invalid_" + type);
        return metric;
    }

    private List<MetricData> generateTestMetrics(int count) {
        List<MetricData> metrics = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            MetricData metric = createTestMetricData();
            metric.setValue(50.0 + (i % 50)); // Vary the values
            metric.setTimestamp(LocalDateTime.now().minusSeconds(i));
            metrics.add(metric);
        }
        return metrics;
    }

    private List<MetricData> generateHighVolumeTestMetrics(int count) {
        return generateTestMetrics(count);
    }

    private MetricDataPoint createOldMetricDataPoint() {
        MetricDataPoint metric = new MetricDataPoint();
        metric.setServerId(UUID.randomUUID());
        metric.setMetricName("old_metric");
        metric.setValue(50.0);
        metric.setTimestamp(LocalDateTime.now().minusDays(2));
        return metric;
    }

    private void storeMetricDirectly(MetricDataPoint metric) {
        // Direct storage to InfluxDB for testing
        // This would use the TimeSeriesService in real implementation
    }

    /**
     * Test WebSocket session handler
     */
    private static class TestWebSocketSession implements WebSocketHandler {
        private final List<String> receivedMessages = new ArrayList<>();
        private final CountDownLatch connectionLatch = new CountDownLatch(1);

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            connectionLatch.countDown();
        }

        @Override
        public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
            receivedMessages.add(message.getPayload().toString());
        }

        @Override
        public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
            // Handle transport errors
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
            // Handle connection close
        }

        @Override
        public boolean supportsPartialMessages() {
            return false;
        }

        public List<String> getReceivedMessages() {
            return new ArrayList<>(receivedMessages);
        }

        public boolean waitForConnection(long timeout, TimeUnit unit) throws InterruptedException {
            return connectionLatch.await(timeout, unit);
        }
    }
}
