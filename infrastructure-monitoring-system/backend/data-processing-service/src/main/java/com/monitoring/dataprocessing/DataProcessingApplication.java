/**
 * 📊 Data Processing Service - Enterprise Stream Processing Pipeline
 * Comprehensive data processing with Kafka streams, batch processing, and monitoring
 */

package com.monitoring.dataprocessing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.annotation.EnableKafkaStreams;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableKafka
@EnableKafkaStreams
@EnableAsync
@EnableScheduling
public class DataProcessingApplication {

    public static void main(String[] args) {
        SpringApplication.run(DataProcessingApplication.class, args);
    }
}

/**
 * Kafka configuration for data processing
 */
package com.monitoring.dataprocessing.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.streams.StreamsConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.KafkaStreamsConfiguration;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id}")
    private String groupId;

    /**
     * Kafka producer configuration
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // Performance optimizations
        configProps.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        configProps.put(ProducerConfig.LINGER_MS_CONFIG, 10);
        configProps.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);
        configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");
        
        // Reliability settings
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");
        configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    /**
     * Kafka consumer configuration
     */
    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        configProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        configProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        
        // Performance optimizations
        configProps.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);
        configProps.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        configProps.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
        
        // Reliability settings
        configProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        configProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        
        // JSON deserializer settings
        configProps.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        configProps.put(JsonDeserializer.VALUE_DEFAULT_TYPE, "com.monitoring.dataprocessing.model.MetricData");
        
        return new DefaultKafkaConsumerFactory<>(configProps);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = 
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        
        // Enable manual acknowledgment
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        
        // Concurrency settings
        factory.setConcurrency(3);
        
        // Error handling
        factory.setCommonErrorHandler(new org.springframework.kafka.listener.DefaultErrorHandler());
        
        return factory;
    }

    /**
     * Kafka Streams configuration
     */
    @Bean(name = KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME)
    public KafkaStreamsConfiguration kStreamsConfig() {
        Map<String, Object> props = new HashMap<>();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "monitoring-data-processing");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, org.apache.kafka.common.serialization.Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, org.springframework.kafka.support.serializer.JsonSerde.class);
        
        // Performance optimizations
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 3);
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);
        props.put(StreamsConfig.CACHE_MAX_BYTES_BUFFERING_CONFIG, 10 * 1024 * 1024L);
        
        // State store configuration
        props.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp/kafka-streams");
        
        return new KafkaStreamsConfiguration(props);
    }
}

/**
 * Metric data model for processing
 */
package com.monitoring.dataprocessing.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public class MetricData {
    
    @JsonProperty("serverId")
    private UUID serverId;
    
    @JsonProperty("serverName")
    private String serverName;
    
    @JsonProperty("organizationId")
    private UUID organizationId;
    
    @JsonProperty("metricName")
    private String metricName;
    
    @JsonProperty("value")
    private Double value;
    
    @JsonProperty("unit")
    private String unit;
    
    @JsonProperty("tags")
    private Map<String, String> tags;
    
    @JsonProperty("timestamp")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;
    
    @JsonProperty("source")
    private String source;
    
    @JsonProperty("environment")
    private String environment;

    // Constructors
    public MetricData() {}

    public MetricData(UUID serverId, String metricName, Double value, LocalDateTime timestamp) {
        this.serverId = serverId;
        this.metricName = metricName;
        this.value = value;
        this.timestamp = timestamp;
    }

    // Business methods
    public String getMetricKey() {
        return String.format("%s:%s:%s", organizationId, serverId, metricName);
    }

    public boolean isValid() {
        return serverId != null && 
               metricName != null && !metricName.trim().isEmpty() &&
               value != null && !value.isNaN() && !value.isInfinite() &&
               timestamp != null;
    }

    public MetricData withAggregatedValue(Double aggregatedValue) {
        MetricData copy = new MetricData();
        copy.serverId = this.serverId;
        copy.serverName = this.serverName;
        copy.organizationId = this.organizationId;
        copy.metricName = this.metricName;
        copy.value = aggregatedValue;
        copy.unit = this.unit;
        copy.tags = this.tags;
        copy.timestamp = this.timestamp;
        copy.source = this.source;
        copy.environment = this.environment;
        return copy;
    }

    // Getters and Setters
    public UUID getServerId() { return serverId; }
    public void setServerId(UUID serverId) { this.serverId = serverId; }

    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    @Override
    public String toString() {
        return "MetricData{" +
                "serverId=" + serverId +
                ", metricName='" + metricName + '\'' +
                ", value=" + value +
                ", timestamp=" + timestamp +
                '}';
    }
}

/**
 * Aggregated metric data model
 */
package com.monitoring.dataprocessing.model;

import java.time.LocalDateTime;
import java.util.UUID;

public class AggregatedMetricData {
    
    private UUID serverId;
    private String metricName;
    private UUID organizationId;
    private LocalDateTime windowStart;
    private LocalDateTime windowEnd;
    private String aggregationType; // AVG, SUM, MIN, MAX, COUNT
    private Double value;
    private Long count;
    private Double min;
    private Double max;
    private Double sum;
    private String unit;
    private String environment;

    // Constructors
    public AggregatedMetricData() {}

    public AggregatedMetricData(UUID serverId, String metricName, UUID organizationId,
                              LocalDateTime windowStart, LocalDateTime windowEnd, String aggregationType) {
        this.serverId = serverId;
        this.metricName = metricName;
        this.organizationId = organizationId;
        this.windowStart = windowStart;
        this.windowEnd = windowEnd;
        this.aggregationType = aggregationType;
        this.count = 0L;
        this.sum = 0.0;
    }

    // Business methods
    public void addValue(Double value) {
        if (value != null && !value.isNaN() && !value.isInfinite()) {
            this.count++;
            this.sum += value;
            
            if (this.min == null || value < this.min) {
                this.min = value;
            }
            
            if (this.max == null || value > this.max) {
                this.max = value;
            }
            
            // Calculate aggregated value based on type
            switch (aggregationType.toUpperCase()) {
                case "AVG":
                    this.value = this.sum / this.count;
                    break;
                case "SUM":
                    this.value = this.sum;
                    break;
                case "MIN":
                    this.value = this.min;
                    break;
                case "MAX":
                    this.value = this.max;
                    break;
                case "COUNT":
                    this.value = this.count.doubleValue();
                    break;
                default:
                    this.value = this.sum / this.count; // Default to average
            }
        }
    }

    public String getAggregationKey() {
        return String.format("%s:%s:%s:%s", organizationId, serverId, metricName, aggregationType);
    }

    // Getters and Setters
    public UUID getServerId() { return serverId; }
    public void setServerId(UUID serverId) { this.serverId = serverId; }

    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public LocalDateTime getWindowStart() { return windowStart; }
    public void setWindowStart(LocalDateTime windowStart) { this.windowStart = windowStart; }

    public LocalDateTime getWindowEnd() { return windowEnd; }
    public void setWindowEnd(LocalDateTime windowEnd) { this.windowEnd = windowEnd; }

    public String getAggregationType() { return aggregationType; }
    public void setAggregationType(String aggregationType) { this.aggregationType = aggregationType; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public Long getCount() { return count; }
    public void setCount(Long count) { this.count = count; }

    public Double getMin() { return min; }
    public void setMin(Double min) { this.min = min; }

    public Double getMax() { return max; }
    public void setMax(Double max) { this.max = max; }

    public Double getSum() { return sum; }
    public void setSum(Double sum) { this.sum = sum; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    @Override
    public String toString() {
        return "AggregatedMetricData{" +
                "serverId=" + serverId +
                ", metricName='" + metricName + '\'' +
                ", aggregationType='" + aggregationType + '\'' +
                ", value=" + value +
                ", count=" + count +
                ", windowStart=" + windowStart +
                ", windowEnd=" + windowEnd +
                '}';
    }
}
