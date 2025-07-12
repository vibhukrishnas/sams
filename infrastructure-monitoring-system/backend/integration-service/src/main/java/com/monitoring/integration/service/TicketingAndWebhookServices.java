/**
 * 🎫 Ticketing and Webhook Services - Enterprise Integration Framework
 * Comprehensive ticketing system integrations and custom webhook framework
 */

package com.monitoring.integration.service.ticketing;

import com.monitoring.integration.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Jira ticketing service implementation
 */
@Service
public class JiraTicketingService implements TicketingService {

    private static final Logger logger = LoggerFactory.getLogger(JiraTicketingService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public TicketResult createTicket(TicketRequest request) {
        logger.info("🎫 Creating Jira ticket: {}", request.getTitle());

        try {
            JiraIntegrationConfig config = (JiraIntegrationConfig) request.getIntegrationConfig();
            
            // Build Jira issue payload
            Map<String, Object> issueData = buildJiraIssue(request, config);
            
            // Set authentication headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(config.getUsername(), config.getApiToken());
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(issueData, headers);
            
            String createUrl = config.getBaseUrl() + "/rest/api/3/issue";
            ResponseEntity<Map> response = restTemplate.postForEntity(createUrl, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                String ticketId = (String) responseBody.get("key");
                String ticketUrl = config.getBaseUrl() + "/browse/" + ticketId;
                
                logger.info("✅ Jira ticket created successfully: {}", ticketId);
                return TicketResult.success(ticketId, ticketUrl, "Jira ticket created successfully");
            } else {
                logger.error("❌ Jira ticket creation failed with status: {}", response.getStatusCode());
                return TicketResult.failure("Jira API returned status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("❌ Error creating Jira ticket: {}", e.getMessage(), e);
            return TicketResult.failure("Error creating Jira ticket: " + e.getMessage());
        }
    }

    @Override
    public TicketResult updateTicket(String ticketId, TicketUpdateRequest request) {
        logger.info("🔄 Updating Jira ticket: {}", ticketId);

        try {
            JiraIntegrationConfig config = (JiraIntegrationConfig) request.getIntegrationConfig();
            
            Map<String, Object> updateData = new HashMap<>();
            Map<String, Object> fields = new HashMap<>();
            
            // Update fields based on request
            if (request.getStatus() != null) {
                Map<String, Object> transition = new HashMap<>();
                transition.put("id", getJiraTransitionId(request.getStatus(), config));
                updateData.put("transition", transition);
            }
            
            if (request.getComment() != null) {
                Map<String, Object> comment = new HashMap<>();
                comment.put("body", request.getComment());
                updateData.put("update", Map.of("comment", List.of(Map.of("add", comment))));
            }
            
            if (request.getAssignee() != null) {
                fields.put("assignee", Map.of("name", request.getAssignee()));
            }
            
            if (request.getPriority() != null) {
                fields.put("priority", Map.of("name", mapSeverityToPriority(request.getPriority())));
            }
            
            if (!fields.isEmpty()) {
                updateData.put("fields", fields);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(config.getUsername(), config.getApiToken());
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(updateData, headers);
            
            String updateUrl = config.getBaseUrl() + "/rest/api/3/issue/" + ticketId;
            ResponseEntity<String> response = restTemplate.exchange(
                updateUrl, HttpMethod.PUT, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("✅ Jira ticket updated successfully: {}", ticketId);
                return TicketResult.success(ticketId, null, "Jira ticket updated successfully");
            } else {
                logger.error("❌ Jira ticket update failed with status: {}", response.getStatusCode());
                return TicketResult.failure("Jira API returned status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("❌ Error updating Jira ticket: {}", e.getMessage(), e);
            return TicketResult.failure("Error updating Jira ticket: " + e.getMessage());
        }
    }

    @Override
    public TicketStatus getTicketStatus(String ticketId, IntegrationConfig config) {
        try {
            JiraIntegrationConfig jiraConfig = (JiraIntegrationConfig) config;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(jiraConfig.getUsername(), jiraConfig.getApiToken());
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            String getUrl = jiraConfig.getBaseUrl() + "/rest/api/3/issue/" + ticketId;
            ResponseEntity<Map> response = restTemplate.exchange(
                getUrl, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> issue = response.getBody();
                Map<String, Object> fields = (Map<String, Object>) issue.get("fields");
                Map<String, Object> status = (Map<String, Object>) fields.get("status");
                
                return mapJiraStatusToTicketStatus((String) status.get("name"));
            }
            
        } catch (Exception e) {
            logger.error("❌ Error getting Jira ticket status: {}", e.getMessage(), e);
        }
        
        return TicketStatus.UNKNOWN;
    }

    private Map<String, Object> buildJiraIssue(TicketRequest request, JiraIntegrationConfig config) {
        Map<String, Object> issue = new HashMap<>();
        Map<String, Object> fields = new HashMap<>();
        
        // Project
        fields.put("project", Map.of("key", config.getProjectKey()));
        
        // Issue type
        fields.put("issuetype", Map.of("name", config.getIssueType()));
        
        // Summary and description
        fields.put("summary", request.getTitle());
        fields.put("description", buildJiraDescription(request));
        
        // Priority
        String priority = mapSeverityToPriority(request.getSeverity());
        fields.put("priority", Map.of("name", priority));
        
        // Labels
        List<String> labels = new ArrayList<>();
        labels.add("sams-monitoring");
        labels.add("automated");
        if (request.getServerName() != null) {
            labels.add("server-" + request.getServerName().replaceAll("[^a-zA-Z0-9]", "-"));
        }
        fields.put("labels", labels);
        
        // Custom fields
        if (config.getCustomFields() != null) {
            fields.putAll(config.getCustomFields());
        }
        
        issue.put("fields", fields);
        return issue;
    }

    private String buildJiraDescription(TicketRequest request) {
        StringBuilder description = new StringBuilder();
        description.append("h2. Alert Details\n\n");
        description.append("*Severity:* ").append(request.getSeverity()).append("\n");
        description.append("*Time:* ").append(LocalDateTime.now()).append("\n");
        
        if (request.getServerName() != null) {
            description.append("*Server:* ").append(request.getServerName()).append("\n");
        }
        
        if (request.getMetricName() != null) {
            description.append("*Metric:* ").append(request.getMetricName()).append("\n");
        }
        
        if (request.getMetricValue() != null) {
            description.append("*Value:* ").append(request.getMetricValue()).append("\n");
        }
        
        description.append("\nh2. Description\n\n");
        description.append(request.getDescription());
        
        description.append("\n\nh2. Recommended Actions\n\n");
        description.append("1. Check server health and resource utilization\n");
        description.append("2. Review recent changes or deployments\n");
        description.append("3. Investigate related alerts or patterns\n");
        description.append("4. Update this ticket with findings and resolution\n");
        
        return description.toString();
    }

    private String mapSeverityToPriority(AlertSeverity severity) {
        switch (severity) {
            case CRITICAL: return "Highest";
            case HIGH: return "High";
            case MEDIUM: return "Medium";
            case LOW: return "Low";
            default: return "Medium";
        }
    }

    private String getJiraTransitionId(TicketStatus status, JiraIntegrationConfig config) {
        // This would typically be configured per Jira instance
        switch (status) {
            case IN_PROGRESS: return "21"; // Start Progress
            case RESOLVED: return "31"; // Resolve Issue
            case CLOSED: return "41"; // Close Issue
            default: return "11"; // To Do
        }
    }

    private TicketStatus mapJiraStatusToTicketStatus(String jiraStatus) {
        switch (jiraStatus.toLowerCase()) {
            case "to do":
            case "open":
                return TicketStatus.OPEN;
            case "in progress":
                return TicketStatus.IN_PROGRESS;
            case "resolved":
                return TicketStatus.RESOLVED;
            case "closed":
                return TicketStatus.CLOSED;
            default:
                return TicketStatus.UNKNOWN;
        }
    }

    @Override
    public boolean testConnection(IntegrationConfig config) {
        try {
            JiraIntegrationConfig jiraConfig = (JiraIntegrationConfig) config;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(jiraConfig.getUsername(), jiraConfig.getApiToken());
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            String testUrl = jiraConfig.getBaseUrl() + "/rest/api/3/myself";
            ResponseEntity<Map> response = restTemplate.exchange(
                testUrl, HttpMethod.GET, entity, Map.class);
            
            return response.getStatusCode().is2xxSuccessful();
            
        } catch (Exception e) {
            logger.error("❌ Jira connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getServiceType() {
        return "jira";
    }
}

/**
 * ServiceNow ticketing service implementation
 */
@Service
public class ServiceNowTicketingService implements TicketingService {

    private static final Logger logger = LoggerFactory.getLogger(ServiceNowTicketingService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public TicketResult createTicket(TicketRequest request) {
        logger.info("🎫 Creating ServiceNow incident: {}", request.getTitle());

        try {
            ServiceNowIntegrationConfig config = (ServiceNowIntegrationConfig) request.getIntegrationConfig();
            
            Map<String, Object> incidentData = buildServiceNowIncident(request, config);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(config.getUsername(), config.getPassword());
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(incidentData, headers);
            
            String createUrl = config.getInstanceUrl() + "/api/now/table/incident";
            ResponseEntity<Map> response = restTemplate.postForEntity(createUrl, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> responseBody = response.getBody();
                Map<String, Object> result = (Map<String, Object>) responseBody.get("result");
                String ticketId = (String) result.get("number");
                String sysId = (String) result.get("sys_id");
                String ticketUrl = config.getInstanceUrl() + "/nav_to.do?uri=incident.do?sys_id=" + sysId;
                
                logger.info("✅ ServiceNow incident created successfully: {}", ticketId);
                return TicketResult.success(ticketId, ticketUrl, "ServiceNow incident created successfully");
            } else {
                logger.error("❌ ServiceNow incident creation failed with status: {}", response.getStatusCode());
                return TicketResult.failure("ServiceNow API returned status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("❌ Error creating ServiceNow incident: {}", e.getMessage(), e);
            return TicketResult.failure("Error creating ServiceNow incident: " + e.getMessage());
        }
    }

    private Map<String, Object> buildServiceNowIncident(TicketRequest request, ServiceNowIntegrationConfig config) {
        Map<String, Object> incident = new HashMap<>();
        
        incident.put("short_description", request.getTitle());
        incident.put("description", request.getDescription());
        incident.put("urgency", mapSeverityToUrgency(request.getSeverity()));
        incident.put("impact", mapSeverityToImpact(request.getSeverity()));
        incident.put("category", "Software");
        incident.put("subcategory", "Monitoring");
        incident.put("caller_id", config.getCallerId());
        incident.put("assignment_group", config.getAssignmentGroup());
        
        // Add custom fields
        incident.put("u_monitoring_system", "SAMS");
        incident.put("u_server_name", request.getServerName());
        incident.put("u_metric_name", request.getMetricName());
        
        if (request.getMetricValue() != null) {
            incident.put("u_metric_value", request.getMetricValue().toString());
        }
        
        return incident;
    }

    private String mapSeverityToUrgency(AlertSeverity severity) {
        switch (severity) {
            case CRITICAL: return "1";
            case HIGH: return "2";
            case MEDIUM: return "3";
            case LOW: return "4";
            default: return "3";
        }
    }

    private String mapSeverityToImpact(AlertSeverity severity) {
        switch (severity) {
            case CRITICAL: return "1";
            case HIGH: return "2";
            case MEDIUM: return "3";
            case LOW: return "4";
            default: return "3";
        }
    }

    @Override
    public TicketResult updateTicket(String ticketId, TicketUpdateRequest request) {
        // ServiceNow update implementation
        logger.info("🔄 ServiceNow ticket update not yet implemented");
        return TicketResult.failure("ServiceNow update not yet implemented");
    }

    @Override
    public TicketStatus getTicketStatus(String ticketId, IntegrationConfig config) {
        // ServiceNow status check implementation
        return TicketStatus.UNKNOWN;
    }

    @Override
    public boolean testConnection(IntegrationConfig config) {
        try {
            ServiceNowIntegrationConfig snowConfig = (ServiceNowIntegrationConfig) config;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(snowConfig.getUsername(), snowConfig.getPassword());
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            String testUrl = snowConfig.getInstanceUrl() + "/api/now/table/sys_user?sysparm_limit=1";
            ResponseEntity<Map> response = restTemplate.exchange(
                testUrl, HttpMethod.GET, entity, Map.class);
            
            return response.getStatusCode().is2xxSuccessful();
            
        } catch (Exception e) {
            logger.error("❌ ServiceNow connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getServiceType() {
        return "servicenow";
    }
}

/**
 * Custom webhook service implementation
 */
package com.monitoring.integration.service.webhook;

import com.monitoring.integration.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class WebhookService {

    private static final Logger logger = LoggerFactory.getLogger(WebhookService.class);

    @Autowired
    private RestTemplate restTemplate;

    public CompletableFuture<WebhookResult> sendWebhook(WebhookRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            logger.info("🔗 Sending webhook to: {}", request.getUrl());

            try {
                WebhookConfig config = request.getConfig();
                
                // Build webhook payload
                Map<String, Object> payload = buildWebhookPayload(request);
                
                // Set headers
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                
                // Add authentication if configured
                if (config.getAuthType() != null) {
                    addAuthentication(headers, config);
                }
                
                // Add custom headers
                if (config.getCustomHeaders() != null) {
                    config.getCustomHeaders().forEach(headers::add);
                }
                
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
                
                ResponseEntity<String> response = restTemplate.postForEntity(
                    request.getUrl(), entity, String.class);
                
                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("✅ Webhook sent successfully to: {}", request.getUrl());
                    return WebhookResult.success("Webhook sent successfully");
                } else {
                    logger.error("❌ Webhook failed with status: {}", response.getStatusCode());
                    return WebhookResult.failure("Webhook returned status: " + response.getStatusCode());
                }
                
            } catch (Exception e) {
                logger.error("❌ Error sending webhook: {}", e.getMessage(), e);
                return WebhookResult.failure("Error sending webhook: " + e.getMessage());
            }
        });
    }

    private Map<String, Object> buildWebhookPayload(WebhookRequest request) {
        Map<String, Object> payload = new HashMap<>();
        
        // Standard SAMS webhook format
        payload.put("event_type", request.getEventType());
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("source", "sams-monitoring");
        payload.put("version", "2.1.0");
        
        // Alert data
        if (request.getAlertData() != null) {
            payload.put("alert", request.getAlertData());
        }
        
        // Server data
        if (request.getServerData() != null) {
            payload.put("server", request.getServerData());
        }
        
        // Metric data
        if (request.getMetricData() != null) {
            payload.put("metric", request.getMetricData());
        }
        
        // Custom data
        if (request.getCustomData() != null) {
            payload.put("custom", request.getCustomData());
        }
        
        return payload;
    }

    private void addAuthentication(HttpHeaders headers, WebhookConfig config) {
        switch (config.getAuthType()) {
            case "bearer":
                headers.setBearerAuth(config.getAuthToken());
                break;
            case "basic":
                headers.setBasicAuth(config.getAuthUsername(), config.getAuthPassword());
                break;
            case "api_key":
                headers.add(config.getApiKeyHeader(), config.getAuthToken());
                break;
        }
    }

    public boolean testWebhook(String url, WebhookConfig config) {
        try {
            WebhookRequest testRequest = new WebhookRequest();
            testRequest.setUrl(url);
            testRequest.setConfig(config);
            testRequest.setEventType("test");
            testRequest.setCustomData(Map.of("message", "SAMS webhook test"));
            
            WebhookResult result = sendWebhook(testRequest).get();
            return result.isSuccess();
            
        } catch (Exception e) {
            logger.error("❌ Webhook test failed: {}", e.getMessage(), e);
            return false;
        }
    }
}
