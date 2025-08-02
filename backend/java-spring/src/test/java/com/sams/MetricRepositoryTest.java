package com.sams;

import com.sams.models.Metric;
import com.sams.repository.MetricRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;

@DataJpaTest
public class MetricRepositoryTest {
    @Autowired
    private MetricRepository metricRepository;

    @Test
    public void testSaveAndRetrieveMetric() {
        Metric metric = new Metric();
        metric.setAgentId("test-agent-001");
        metric.setCpuUsage(45.5);
        metric.setMemoryUsage(62.3);
        Metric saved = metricRepository.save(metric);
        assertNotNull(saved.getId());
        assertEquals("test-agent-001", saved.getAgentId());
    }

    @Test
    public void testFindRecentMetrics() {
        // Test implementation
    }
}
