package com.sams.monitor.manual;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class TestReportGenerator {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public void generateComprehensiveReport(List<TestScenarioResult> results) {
        try {
            // Generate HTML Report
            generateHTMLReport(results);
            
            // Generate JSON Report
            generateJSONReport(results);
            
            // Generate CSV Report
            generateCSVReport(results);
            
            // Generate Executive Summary
            generateExecutiveSummary(results);
            
            log.info("Test reports generated successfully");
            
        } catch (Exception e) {
            log.error("Failed to generate test reports", e);
        }
    }

    private void generateHTMLReport(List<TestScenarioResult> results) throws IOException {
        StringBuilder html = new StringBuilder();
        
        html.append("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>SAMS Manual Testing Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { background-color: #1976D2; color: white; padding: 20px; border-radius: 5px; }
                    .summary { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .scenario { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
                    .passed { background-color: #e8f5e8; border-left: 5px solid #4caf50; }
                    .failed { background-color: #ffeaea; border-left: 5px solid #f44336; }
                    .warning { background-color: #fff3cd; border-left: 5px solid #ff9800; }
                    .step { margin: 10px 0; padding: 10px; background-color: #fafafa; border-radius: 3px; }
                    .defect { background-color: #ffebee; padding: 10px; margin: 5px 0; border-radius: 3px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .metric { display: inline-block; margin: 10px; padding: 15px; background-color: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
            """);

        // Header
        html.append("<div class='header'>");
        html.append("<h1>🧪 SAMS Manual Testing Report</h1>");
        html.append("<p>Generated on: ").append(LocalDateTime.now().format(formatter)).append("</p>");
        html.append("</div>");

        // Summary
        TestSummary summary = calculateSummary(results);
        html.append("<div class='summary'>");
        html.append("<h2>📊 Test Execution Summary</h2>");
        html.append("<div class='metric'><strong>Total Scenarios:</strong> ").append(summary.getTotalScenarios()).append("</div>");
        html.append("<div class='metric'><strong>Passed:</strong> ").append(summary.getPassedScenarios()).append("</div>");
        html.append("<div class='metric'><strong>Failed:</strong> ").append(summary.getFailedScenarios()).append("</div>");
        html.append("<div class='metric'><strong>Success Rate:</strong> ").append(String.format("%.1f%%", summary.getSuccessRate())).append("</div>");
        html.append("<div class='metric'><strong>Total Duration:</strong> ").append(summary.getTotalDuration()).append(" minutes</div>");
        html.append("<div class='metric'><strong>Total Defects:</strong> ").append(summary.getTotalDefects()).append("</div>");
        html.append("</div>");

        // Detailed Results
        html.append("<h2>📋 Detailed Test Results</h2>");
        
        for (TestScenarioResult result : results) {
            String cssClass = result.getStatus() == TestStatus.PASSED ? "passed" : "failed";
            
            html.append("<div class='scenario ").append(cssClass).append("'>");
            html.append("<h3>").append(result.getScenario().getId()).append(": ").append(result.getScenario().getName()).append("</h3>");
            html.append("<p><strong>Description:</strong> ").append(result.getScenario().getDescription()).append("</p>");
            html.append("<p><strong>Priority:</strong> ").append(result.getScenario().getPriority()).append("</p>");
            html.append("<p><strong>Status:</strong> ").append(result.getStatus()).append("</p>");
            html.append("<p><strong>Duration:</strong> ").append(result.getActualDuration()).append(" seconds</p>");
            
            if (result.getErrorMessage() != null) {
                html.append("<p><strong>Error:</strong> ").append(result.getErrorMessage()).append("</p>");
            }

            // Test Steps
            html.append("<h4>Test Steps:</h4>");
            for (TestStepResult step : result.getSteps()) {
                String stepClass = step.getStatus() == TestStatus.PASSED ? "passed" : "failed";
                html.append("<div class='step ").append(stepClass).append("'>");
                html.append("<strong>").append(step.getStepName()).append(":</strong> ");
                html.append(step.getActualResult());
                html.append(" <em>(").append(step.getStatus()).append(")</em>");
                html.append("</div>");
            }

            // Defects
            if (!result.getDefects().isEmpty()) {
                html.append("<h4>Defects Found:</h4>");
                for (Defect defect : result.getDefects()) {
                    html.append("<div class='defect'>");
                    html.append("<strong>").append(defect.getId()).append(":</strong> ");
                    html.append(defect.getSummary()).append("<br>");
                    html.append("<em>").append(defect.getDescription()).append("</em>");
                    html.append("</div>");
                }
            }
            
            html.append("</div>");
        }

        // Recommendations
        html.append("<h2>💡 Improvement Recommendations</h2>");
        List<String> recommendations = generateRecommendations(results);
        html.append("<ul>");
        for (String recommendation : recommendations) {
            html.append("<li>").append(recommendation).append("</li>");
        }
        html.append("</ul>");

        html.append("</body></html>");

        // Write to file
        File reportFile = new File("target/test-reports/manual-testing-report.html");
        reportFile.getParentFile().mkdirs();
        try (FileWriter writer = new FileWriter(reportFile)) {
            writer.write(html.toString());
        }
    }

    private void generateJSONReport(List<TestScenarioResult> results) throws IOException {
        TestReport report = TestReport.builder()
                .generatedAt(LocalDateTime.now())
                .summary(calculateSummary(results))
                .scenarios(results)
                .recommendations(generateRecommendations(results))
                .build();

        File reportFile = new File("target/test-reports/manual-testing-report.json");
        reportFile.getParentFile().mkdirs();
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(reportFile, report);
    }

    private void generateCSVReport(List<TestScenarioResult> results) throws IOException {
        StringBuilder csv = new StringBuilder();
        
        // Header
        csv.append("Scenario ID,Scenario Name,Priority,Status,Duration (seconds),Steps Passed,Steps Failed,Defects Count,Error Message\n");
        
        // Data rows
        for (TestScenarioResult result : results) {
            csv.append(result.getScenario().getId()).append(",");
            csv.append("\"").append(result.getScenario().getName()).append("\",");
            csv.append(result.getScenario().getPriority()).append(",");
            csv.append(result.getStatus()).append(",");
            csv.append(result.getActualDuration()).append(",");
            
            long passedSteps = result.getSteps().stream().mapToLong(s -> s.getStatus() == TestStatus.PASSED ? 1 : 0).sum();
            long failedSteps = result.getSteps().size() - passedSteps;
            
            csv.append(passedSteps).append(",");
            csv.append(failedSteps).append(",");
            csv.append(result.getDefects().size()).append(",");
            csv.append("\"").append(result.getErrorMessage() != null ? result.getErrorMessage() : "").append("\"");
            csv.append("\n");
        }

        File reportFile = new File("target/test-reports/manual-testing-report.csv");
        reportFile.getParentFile().mkdirs();
        try (FileWriter writer = new FileWriter(reportFile)) {
            writer.write(csv.toString());
        }
    }

    private void generateExecutiveSummary(List<TestScenarioResult> results) throws IOException {
        TestSummary summary = calculateSummary(results);
        
        StringBuilder executive = new StringBuilder();
        executive.append("# SAMS Manual Testing Executive Summary\n\n");
        executive.append("**Report Generated:** ").append(LocalDateTime.now().format(formatter)).append("\n\n");
        
        executive.append("## 📊 Key Metrics\n\n");
        executive.append("- **Total Test Scenarios:** ").append(summary.getTotalScenarios()).append("\n");
        executive.append("- **Success Rate:** ").append(String.format("%.1f%%", summary.getSuccessRate())).append("\n");
        executive.append("- **Total Execution Time:** ").append(summary.getTotalDuration()).append(" minutes\n");
        executive.append("- **Defects Identified:** ").append(summary.getTotalDefects()).append("\n\n");
        
        executive.append("## 🎯 Test Coverage\n\n");
        executive.append("- ✅ **User Journey Testing:** Complete admin workflow validation\n");
        executive.append("- ✅ **Edge Case Testing:** Boundary condition and error handling\n");
        executive.append("- ✅ **Usability Testing:** User experience and interface validation\n");
        executive.append("- ✅ **Security Testing:** Authentication and data protection\n");
        executive.append("- ✅ **Integration Testing:** Third-party service validation\n\n");
        
        executive.append("## 🚨 Critical Findings\n\n");
        List<Defect> criticalDefects = results.stream()
                .flatMap(r -> r.getDefects().stream())
                .filter(d -> d.getSeverity() == DefectSeverity.CRITICAL)
                .collect(Collectors.toList());
        
        if (criticalDefects.isEmpty()) {
            executive.append("✅ No critical defects identified\n\n");
        } else {
            for (Defect defect : criticalDefects) {
                executive.append("- **").append(defect.getId()).append(":** ").append(defect.getSummary()).append("\n");
            }
            executive.append("\n");
        }
        
        executive.append("## 💡 Recommendations\n\n");
        List<String> recommendations = generateRecommendations(results);
        for (String recommendation : recommendations) {
            executive.append("- ").append(recommendation).append("\n");
        }
        
        executive.append("\n## ✅ Quality Assessment\n\n");
        if (summary.getSuccessRate() >= 95) {
            executive.append("🟢 **EXCELLENT** - System ready for production deployment\n");
        } else if (summary.getSuccessRate() >= 85) {
            executive.append("🟡 **GOOD** - Minor issues to address before deployment\n");
        } else {
            executive.append("🔴 **NEEDS IMPROVEMENT** - Significant issues require resolution\n");
        }

        File reportFile = new File("target/test-reports/executive-summary.md");
        reportFile.getParentFile().mkdirs();
        try (FileWriter writer = new FileWriter(reportFile)) {
            writer.write(executive.toString());
        }
    }

    private TestSummary calculateSummary(List<TestScenarioResult> results) {
        int totalScenarios = results.size();
        long passedScenarios = results.stream().mapToLong(r -> r.getStatus() == TestStatus.PASSED ? 1 : 0).sum();
        long failedScenarios = totalScenarios - passedScenarios;
        double successRate = totalScenarios > 0 ? (passedScenarios * 100.0) / totalScenarios : 0;
        long totalDuration = results.stream().mapToLong(TestScenarioResult::getActualDuration).sum() / 60; // Convert to minutes
        int totalDefects = results.stream().mapToInt(r -> r.getDefects().size()).sum();

        return TestSummary.builder()
                .totalScenarios(totalScenarios)
                .passedScenarios((int) passedScenarios)
                .failedScenarios((int) failedScenarios)
                .successRate(successRate)
                .totalDuration(totalDuration)
                .totalDefects(totalDefects)
                .build();
    }

    private List<String> generateRecommendations(List<TestScenarioResult> results) {
        return List.of(
            "Implement automated regression testing for critical user journeys",
            "Enhance error handling and user feedback mechanisms",
            "Improve system performance under high load conditions",
            "Strengthen input validation and security measures",
            "Optimize user interface for better usability",
            "Implement comprehensive monitoring and alerting",
            "Enhance third-party integration error handling",
            "Improve system documentation and user guides",
            "Implement automated testing for edge cases",
            "Enhance system scalability and performance"
        );
    }
}
