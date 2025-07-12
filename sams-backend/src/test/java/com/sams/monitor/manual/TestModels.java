package com.sams.monitor.manual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Test Scenario Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestScenario {
    private String id;
    private String name;
    private String description;
    private String priority;
    private int estimatedDuration; // in seconds
    private List<String> tags;
    private String category;
    private String owner;
    private LocalDateTime createdDate;
}

// Test Scenario Result Model
@Data
@NoArgsConstructor
@AllArgsConstructor
class TestScenarioResult {
    private TestScenario scenario;
    private TestStatus status;
    private long actualDuration; // in seconds
    private String errorMessage;
    private LocalDateTime executionDate;
    private List<TestStepResult> steps;
    private List<Defect> defects;
    private String environment;
    private String executedBy;

    public TestScenarioResult(TestScenario scenario) {
        this.scenario = scenario;
        this.steps = new ArrayList<>();
        this.defects = new ArrayList<>();
        this.executionDate = LocalDateTime.now();
        this.environment = "test";
        this.executedBy = "automated";
    }

    public void addStep(TestStepResult step) {
        this.steps.add(step);
    }

    public void addDefect(Defect defect) {
        this.defects.add(defect);
    }
}

// Test Step Result Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestStepResult {
    private String stepName;
    private String description;
    private TestStatus status;
    private String expectedResult;
    private String actualResult;
    private long executionTime; // in milliseconds
    private String errorMessage;
    private List<String> screenshots;
    private String notes;
}

// Test Status Enum
enum TestStatus {
    PASSED,
    FAILED,
    SKIPPED,
    BLOCKED,
    IN_PROGRESS
}

// Defect Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class Defect {
    private String id;
    private String summary;
    private String description;
    private DefectSeverity severity;
    private DefectPriority priority;
    private DefectStatus status;
    private String assignee;
    private LocalDateTime reportedDate;
    private LocalDateTime resolvedDate;
    private String resolution;
    private List<String> attachments;
    private String environment;
    private String browser;
    private String operatingSystem;
    private String stepsToReproduce;
}

// Defect Severity Enum
enum DefectSeverity {
    CRITICAL,
    HIGH,
    MEDIUM,
    LOW
}

// Defect Priority Enum
enum DefectPriority {
    URGENT,
    HIGH,
    MEDIUM,
    LOW
}

// Defect Status Enum
enum DefectStatus {
    OPEN,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    REJECTED,
    DEFERRED
}

// Test Summary Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestSummary {
    private int totalScenarios;
    private int passedScenarios;
    private int failedScenarios;
    private int skippedScenarios;
    private double successRate;
    private long totalDuration; // in minutes
    private int totalDefects;
    private int criticalDefects;
    private int highDefects;
    private int mediumDefects;
    private int lowDefects;
    private String environment;
    private LocalDateTime executionDate;
}

// Test Report Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestReport {
    private LocalDateTime generatedAt;
    private TestSummary summary;
    private List<TestScenarioResult> scenarios;
    private List<String> recommendations;
    private String version;
    private String environment;
    private String reportType;
}

// Test Configuration Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestConfiguration {
    private String environment;
    private String baseUrl;
    private int timeout;
    private boolean headless;
    private String browser;
    private String resolution;
    private boolean captureScreenshots;
    private boolean recordVideo;
    private String reportFormat;
    private List<String> tags;
}

// Test Data Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestData {
    private String id;
    private String name;
    private String category;
    private Object data;
    private String description;
    private boolean sensitive;
    private LocalDateTime createdDate;
    private LocalDateTime lastUsed;
}

// Test Environment Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestEnvironment {
    private String name;
    private String url;
    private String database;
    private String version;
    private boolean active;
    private LocalDateTime lastDeployment;
    private List<String> features;
    private String description;
}

// Performance Metrics Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PerformanceMetrics {
    private String testName;
    private long responseTime; // in milliseconds
    private long loadTime; // in milliseconds
    private double cpuUsage; // percentage
    private double memoryUsage; // percentage
    private int concurrentUsers;
    private double throughput; // requests per second
    private double errorRate; // percentage
    private LocalDateTime timestamp;
}

// Security Test Result Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityTestResult {
    private String testName;
    private String vulnerability;
    private String severity;
    private String description;
    private String recommendation;
    private boolean exploitable;
    private String cveId;
    private double cvssScore;
    private LocalDateTime discoveredDate;
    private String status;
}

// Accessibility Test Result Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AccessibilityTestResult {
    private String testName;
    private String guideline; // WCAG 2.1 AA
    private String level; // A, AA, AAA
    private String issue;
    private String element;
    private String recommendation;
    private String severity;
    private boolean automated;
    private LocalDateTime testDate;
}

// Usability Test Result Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class UsabilityTestResult {
    private String testName;
    private String userType;
    private String task;
    private boolean completed;
    private long completionTime; // in seconds
    private int errorCount;
    private int satisfactionScore; // 1-10
    private String feedback;
    private List<String> observations;
    private LocalDateTime testDate;
}

// Integration Test Result Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class IntegrationTestResult {
    private String testName;
    private String service;
    private String endpoint;
    private int statusCode;
    private long responseTime;
    private boolean dataValid;
    private String errorMessage;
    private String requestPayload;
    private String responsePayload;
    private LocalDateTime testDate;
}

// Load Test Result Model
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
}

// Test Execution Context Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class TestExecutionContext {
    private String executionId;
    private String buildNumber;
    private String branch;
    private String commit;
    private String environment;
    private String executor;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private TestConfiguration configuration;
    private List<String> tags;
    private String notes;
}
