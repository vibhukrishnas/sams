package com.sams.monitor.performance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// Load Test Configuration
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class LoadTestConfiguration {
    private String testName;
    private int virtualUsers;
    private int duration; // in seconds
    private int rampUpTime; // in seconds
    private double targetThroughput; // requests per second
    private String scenario;
    private Map<String, Object> parameters;
}

// Load Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class LoadTestResult {
    private String testName;
    private int virtualUsers;
    private long duration; // in seconds
    private double averageResponseTime;
    private double maxResponseTime;
    private double minResponseTime;
    private double throughput;
    private double errorRate;
    private int totalRequests;
    private int successfulRequests;
    private int failedRequests;
    private LocalDateTime testDate;
    private Map<String, Double> percentiles; // 50th, 90th, 95th, 99th
    private List<String> errors;
}

// Database Load Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DatabaseLoadTestResult {
    private String testName;
    private double averageQueryTime;
    private double maxQueryTime;
    private double minQueryTime;
    private double connectionPoolUtilization;
    private int deadlockCount;
    private int slowQueryCount;
    private double transactionsPerSecond;
    private double cacheHitRatio;
    private long totalConnections;
    private long activeConnections;
    private LocalDateTime testDate;
    private Map<String, Double> queryTypePerformance;
}

// WebSocket Load Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class WebSocketLoadTestResult {
    private String testName;
    private double connectionSuccessRate;
    private double averageLatency;
    private double maxLatency;
    private double messageDeliveryRate;
    private double connectionDropRate;
    private int totalConnections;
    private int activeConnections;
    private long totalMessages;
    private long successfulMessages;
    private long failedMessages;
    private LocalDateTime testDate;
}

// Mobile Performance Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class MobilePerformanceTestResult {
    private String testName;
    private long appStartupTime; // in milliseconds
    private double memoryUsage; // in MB
    private double cpuUsage; // percentage
    private double batteryDrainRate; // percentage per hour
    private double networkUsage; // in MB
    private double frameRate; // FPS
    private long renderTime; // in milliseconds
    private int crashCount;
    private int anrCount; // Application Not Responding
    private LocalDateTime testDate;
    private String deviceModel;
    private String osVersion;
}

// System Performance Metrics
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SystemPerformanceMetrics {
    private double cpuUtilization;
    private double memoryUtilization;
    private double diskUtilization;
    private double networkUtilization;
    private int activeThreads;
    private int totalThreads;
    private long heapMemoryUsed;
    private long heapMemoryMax;
    private long nonHeapMemoryUsed;
    private double gcTime; // percentage
    private int gcCount;
    private LocalDateTime timestamp;
}

// API Performance Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ApiPerformanceTestResult {
    private String endpoint;
    private String method;
    private double averageResponseTime;
    private double maxResponseTime;
    private double minResponseTime;
    private double throughput;
    private double errorRate;
    private int totalRequests;
    private int successfulRequests;
    private int failedRequests;
    private Map<Integer, Integer> statusCodeDistribution;
    private Map<String, Double> responseTimePercentiles;
    private LocalDateTime testDate;
}

// Stress Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class StressTestResult {
    private String testName;
    private int maxUsers;
    private int breakingPoint;
    private double maxThroughput;
    private double degradationPoint;
    private double recoveryTime;
    private boolean systemRecovered;
    private List<String> failurePoints;
    private SystemPerformanceMetrics peakMetrics;
    private LocalDateTime testDate;
}

// Volume Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class VolumeTestResult {
    private String testName;
    private long dataVolume; // in MB
    private double processingTime;
    private double storageTime;
    private double retrievalTime;
    private boolean dataIntegrityMaintained;
    private double systemStability;
    private long memoryFootprint;
    private LocalDateTime testDate;
}

// Endurance Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class EnduranceTestResult {
    private String testName;
    private long duration; // in hours
    private double averageResponseTime;
    private double responseTimeDegradation;
    private double memoryLeakRate;
    private double errorRateIncrease;
    private boolean systemStable;
    private List<SystemPerformanceMetrics> performanceOverTime;
    private LocalDateTime testDate;
}

// Spike Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SpikeTestResult {
    private String testName;
    private int baselineUsers;
    private int spikeUsers;
    private double spikeResponseTime;
    private double recoveryTime;
    private boolean systemHandledSpike;
    private double errorRateDuringSpike;
    private SystemPerformanceMetrics spikeMetrics;
    private LocalDateTime testDate;
}

// Performance Test Suite Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceTestSuiteResult {
    private String suiteName;
    private List<LoadTestResult> loadTests;
    private List<StressTestResult> stressTests;
    private List<VolumeTestResult> volumeTests;
    private List<EnduranceTestResult> enduranceTests;
    private List<SpikeTestResult> spikeTests;
    private DatabaseLoadTestResult databaseTest;
    private WebSocketLoadTestResult webSocketTest;
    private MobilePerformanceTestResult mobileTest;
    private PerformanceTestSummary summary;
    private LocalDateTime executionDate;
    private String environment;
    private String version;
}

// Performance Test Summary
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceTestSummary {
    private int totalTests;
    private int passedTests;
    private int failedTests;
    private double overallSuccessRate;
    private double averageResponseTime;
    private double maxThroughput;
    private double systemStabilityScore;
    private List<String> performanceIssues;
    private List<String> recommendations;
    private String performanceGrade; // A, B, C, D, F
}

// Performance Benchmark
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceBenchmark {
    private String metric;
    private double target;
    private double actual;
    private boolean passed;
    private String unit;
    private String description;
    private String category;
}

// Performance Threshold
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceThreshold {
    private String metric;
    private double warningThreshold;
    private double criticalThreshold;
    private String unit;
    private String description;
}

// Performance Alert
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceAlert {
    private String metric;
    private double value;
    private double threshold;
    private String severity;
    private String message;
    private LocalDateTime timestamp;
    private String testName;
}

// Resource Utilization
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ResourceUtilization {
    private double cpuUsage;
    private double memoryUsage;
    private double diskUsage;
    private double networkUsage;
    private int threadCount;
    private int connectionCount;
    private LocalDateTime timestamp;
    private String component;
}

// Performance Trend
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceTrend {
    private String metric;
    private List<Double> values;
    private List<LocalDateTime> timestamps;
    private double trend; // positive = improving, negative = degrading
    private String analysis;
    private String recommendation;
}

// Load Test Scenario
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class LoadTestScenario {
    private String name;
    private String description;
    private int virtualUsers;
    private int duration;
    private int rampUpTime;
    private List<String> endpoints;
    private Map<String, Integer> requestDistribution;
    private Map<String, Object> testData;
}

// Performance Report Configuration
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceReportConfiguration {
    private boolean includeGraphs;
    private boolean includeRawData;
    private boolean includeRecommendations;
    private String format; // HTML, PDF, JSON
    private List<String> metrics;
    private String outputDirectory;
}
