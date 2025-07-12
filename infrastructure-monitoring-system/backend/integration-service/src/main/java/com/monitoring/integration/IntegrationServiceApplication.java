/**
 * 🔗 Integration Service - Comprehensive Third-Party Integrations
 * Enterprise integration microservice for notifications, ticketing, and webhooks
 */

package com.monitoring.integration;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableKafka
@EnableAsync
@EnableScheduling
public class IntegrationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IntegrationServiceApplication.class, args);
    }
}

/**
 * Integration configuration and service registry
 */
package com.monitoring.integration.config;

import com.monitoring.integration.service.notification.*;
import com.monitoring.integration.service.ticketing.*;
import com.monitoring.integration.service.webhook.WebhookService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.client.CloseableHttpClient;

import java.time.Duration;

@Configuration
public class IntegrationConfig {

    @Bean
    public RestTemplate restTemplate() {
        CloseableHttpClient httpClient = HttpClients.custom()
                .setMaxConnTotal(100)
                .setMaxConnPerRoute(20)
                .build();
        
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(60000);
        
        return new RestTemplate(factory);
    }

    @Bean
    public IntegrationServiceRegistry integrationServiceRegistry(
            SlackNotificationService slackService,
            TeamsNotificationService teamsService,
            EmailNotificationService emailService,
            SmsNotificationService smsService,
            JiraTicketingService jiraService,
            ServiceNowTicketingService serviceNowService,
            WebhookService webhookService) {
        
        IntegrationServiceRegistry registry = new IntegrationServiceRegistry();
        
        // Register notification services
        registry.registerNotificationService("slack", slackService);
        registry.registerNotificationService("teams", teamsService);
        registry.registerNotificationService("email", emailService);
        registry.registerNotificationService("sms", smsService);
        
        // Register ticketing services
        registry.registerTicketingService("jira", jiraService);
        registry.registerTicketingService("servicenow", serviceNowService);
        
        // Register webhook service
        registry.registerWebhookService(webhookService);
        
        return registry;
    }
}

/**
 * Integration service registry for managing all integrations
 */
package com.monitoring.integration.service;

import com.monitoring.integration.service.notification.NotificationService;
import com.monitoring.integration.service.ticketing.TicketingService;
import com.monitoring.integration.service.webhook.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IntegrationServiceRegistry {

    private static final Logger logger = LoggerFactory.getLogger(IntegrationServiceRegistry.class);

    private final Map<String, NotificationService> notificationServices = new ConcurrentHashMap<>();
    private final Map<String, TicketingService> ticketingServices = new ConcurrentHashMap<>();
    private WebhookService webhookService;

    public void registerNotificationService(String type, NotificationService service) {
        notificationServices.put(type, service);
        logger.info("📧 Registered notification service: {}", type);
    }

    public void registerTicketingService(String type, TicketingService service) {
        ticketingServices.put(type, service);
        logger.info("🎫 Registered ticketing service: {}", type);
    }

    public void registerWebhookService(WebhookService service) {
        this.webhookService = service;
        logger.info("🔗 Registered webhook service");
    }

    public NotificationService getNotificationService(String type) {
        return notificationServices.get(type);
    }

    public TicketingService getTicketingService(String type) {
        return ticketingServices.get(type);
    }

    public WebhookService getWebhookService() {
        return webhookService;
    }

    public Map<String, NotificationService> getAllNotificationServices() {
        return Map.copyOf(notificationServices);
    }

    public Map<String, TicketingService> getAllTicketingServices() {
        return Map.copyOf(ticketingServices);
    }
}

/**
 * Slack notification service implementation
 */
package com.monitoring.integration.service.notification;

import com.monitoring.integration.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SlackNotificationService implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(SlackNotificationService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public NotificationResult sendNotification(NotificationRequest request) {
        logger.info("📱 Sending Slack notification: {}", request.getTitle());

        try {
            SlackIntegrationConfig config = (SlackIntegrationConfig) request.getIntegrationConfig();
            
            // Build Slack message
            Map<String, Object> slackMessage = buildSlackMessage(request, config);
            
            // Send to Slack webhook
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(slackMessage, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                config.getWebhookUrl(), entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("✅ Slack notification sent successfully");
                return NotificationResult.success("Slack notification sent successfully");
            } else {
                logger.error("❌ Slack notification failed with status: {}", response.getStatusCode());
                return NotificationResult.failure("Slack API returned status: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("❌ Error sending Slack notification: {}", e.getMessage(), e);
            return NotificationResult.failure("Error sending Slack notification: " + e.getMessage());
        }
    }

    private Map<String, Object> buildSlackMessage(NotificationRequest request, SlackIntegrationConfig config) {
        Map<String, Object> message = new HashMap<>();
        
        // Basic message properties
        message.put("username", "SAMS Monitoring");
        message.put("icon_emoji", ":warning:");
        
        if (config.getChannel() != null) {
            message.put("channel", config.getChannel());
        }
        
        // Build rich message with attachments
        List<Map<String, Object>> attachments = new ArrayList<>();
        Map<String, Object> attachment = new HashMap<>();
        
        // Set color based on severity
        String color = getColorForSeverity(request.getSeverity());
        attachment.put("color", color);
        
        // Main message
        attachment.put("title", request.getTitle());
        attachment.put("text", request.getMessage());
        attachment.put("ts", System.currentTimeMillis() / 1000);
        
        // Add fields
        List<Map<String, Object>> fields = new ArrayList<>();
        
        if (request.getServerId() != null) {
            fields.add(createField("Server", request.getServerName(), true));
        }
        
        fields.add(createField("Severity", request.getSeverity().toString(), true));
        fields.add(createField("Time", LocalDateTime.now().toString(), true));
        
        if (request.getMetricName() != null) {
            fields.add(createField("Metric", request.getMetricName(), true));
        }
        
        if (request.getMetricValue() != null) {
            fields.add(createField("Value", request.getMetricValue().toString(), true));
        }
        
        attachment.put("fields", fields);
        
        // Add action buttons if configured
        if (config.isIncludeActions()) {
            List<Map<String, Object>> actions = new ArrayList<>();
            
            actions.add(createAction("acknowledge", "Acknowledge", "primary"));
            actions.add(createAction("resolve", "Resolve", "good"));
            actions.add(createAction("escalate", "Escalate", "danger"));
            
            attachment.put("actions", actions);
        }
        
        attachments.add(attachment);
        message.put("attachments", attachments);
        
        return message;
    }

    private String getColorForSeverity(AlertSeverity severity) {
        switch (severity) {
            case CRITICAL: return "danger";
            case HIGH: return "warning";
            case MEDIUM: return "good";
            case LOW: return "#36a64f";
            default: return "good";
        }
    }

    private Map<String, Object> createField(String title, String value, boolean isShort) {
        Map<String, Object> field = new HashMap<>();
        field.put("title", title);
        field.put("value", value);
        field.put("short", isShort);
        return field;
    }

    private Map<String, Object> createAction(String name, String text, String style) {
        Map<String, Object> action = new HashMap<>();
        action.put("name", name);
        action.put("text", text);
        action.put("type", "button");
        action.put("style", style);
        return action;
    }

    @Override
    public boolean testConnection(IntegrationConfig config) {
        try {
            SlackIntegrationConfig slackConfig = (SlackIntegrationConfig) config;
            
            // Send test message
            Map<String, Object> testMessage = new HashMap<>();
            testMessage.put("text", "🧪 SAMS Monitoring - Connection Test");
            testMessage.put("username", "SAMS Monitoring");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(testMessage, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                slackConfig.getWebhookUrl(), entity, String.class);
            
            return response.getStatusCode().is2xxSuccessful();
            
        } catch (Exception e) {
            logger.error("❌ Slack connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getServiceType() {
        return "slack";
    }
}

/**
 * Email notification service implementation
 */
package com.monitoring.integration.service.notification;

import com.monitoring.integration.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class EmailNotificationService implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Override
    public NotificationResult sendNotification(NotificationRequest request) {
        logger.info("📧 Sending email notification: {}", request.getTitle());

        try {
            EmailIntegrationConfig config = (EmailIntegrationConfig) request.getIntegrationConfig();
            
            if ("sendgrid".equalsIgnoreCase(config.getProvider())) {
                return sendViaSendGrid(request, config);
            } else if ("aws-ses".equalsIgnoreCase(config.getProvider())) {
                return sendViaAwsSes(request, config);
            } else {
                return sendViaSmtp(request, config);
            }
            
        } catch (Exception e) {
            logger.error("❌ Error sending email notification: {}", e.getMessage(), e);
            return NotificationResult.failure("Error sending email: " + e.getMessage());
        }
    }

    private NotificationResult sendViaSendGrid(NotificationRequest request, EmailIntegrationConfig config) {
        try {
            Map<String, Object> emailData = new HashMap<>();
            
            // Personalizations
            List<Map<String, Object>> personalizations = new ArrayList<>();
            Map<String, Object> personalization = new HashMap<>();
            
            List<Map<String, String>> toList = new ArrayList<>();
            for (String recipient : config.getRecipients()) {
                toList.add(Map.of("email", recipient));
            }
            personalization.put("to", toList);
            personalization.put("subject", request.getTitle());
            
            personalizations.add(personalization);
            emailData.put("personalizations", personalizations);
            
            // From
            emailData.put("from", Map.of("email", config.getFromEmail(), "name", "SAMS Monitoring"));
            
            // Content
            List<Map<String, String>> content = new ArrayList<>();
            content.add(Map.of(
                "type", "text/html",
                "value", buildHtmlContent(request)
            ));
            emailData.put("content", content);
            
            // Send via SendGrid API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(config.getApiKey());
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(emailData, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.sendgrid.com/v3/mail/send", entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("✅ Email sent successfully via SendGrid");
                return NotificationResult.success("Email sent via SendGrid");
            } else {
                logger.error("❌ SendGrid API error: {}", response.getStatusCode());
                return NotificationResult.failure("SendGrid API error: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("❌ SendGrid email error: {}", e.getMessage(), e);
            return NotificationResult.failure("SendGrid error: " + e.getMessage());
        }
    }

    private NotificationResult sendViaAwsSes(NotificationRequest request, EmailIntegrationConfig config) {
        // AWS SES implementation would go here
        // This would use AWS SDK for Java
        logger.info("📧 AWS SES integration not yet implemented");
        return NotificationResult.failure("AWS SES integration not yet implemented");
    }

    private NotificationResult sendViaSmtp(NotificationRequest request, EmailIntegrationConfig config) {
        // SMTP implementation would go here
        // This would use JavaMail API
        logger.info("📧 SMTP integration not yet implemented");
        return NotificationResult.failure("SMTP integration not yet implemented");
    }

    private String buildHtmlContent(NotificationRequest request) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html><head><meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }");
        html.append(".container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }");
        html.append(".header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 30px; }");
        html.append(".alert-info { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }");
        html.append(".severity-critical { border-left-color: #dc3545; }");
        html.append(".severity-high { border-left-color: #fd7e14; }");
        html.append(".severity-medium { border-left-color: #ffc107; }");
        html.append(".severity-low { border-left-color: #28a745; }");
        html.append(".footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }");
        html.append("</style></head><body>");
        
        html.append("<div class='container'>");
        html.append("<div class='header'>");
        html.append("<h1>🚨 SAMS Monitoring Alert</h1>");
        html.append("</div>");
        
        html.append("<div class='content'>");
        html.append("<h2>").append(request.getTitle()).append("</h2>");
        html.append("<p>").append(request.getMessage()).append("</p>");
        
        String severityClass = "severity-" + request.getSeverity().toString().toLowerCase();
        html.append("<div class='alert-info ").append(severityClass).append("'>");
        html.append("<strong>Alert Details:</strong><br>");
        html.append("<strong>Severity:</strong> ").append(request.getSeverity()).append("<br>");
        
        if (request.getServerName() != null) {
            html.append("<strong>Server:</strong> ").append(request.getServerName()).append("<br>");
        }
        
        if (request.getMetricName() != null) {
            html.append("<strong>Metric:</strong> ").append(request.getMetricName()).append("<br>");
        }
        
        if (request.getMetricValue() != null) {
            html.append("<strong>Value:</strong> ").append(request.getMetricValue()).append("<br>");
        }
        
        html.append("<strong>Time:</strong> ").append(new Date()).append("<br>");
        html.append("</div>");
        
        html.append("<p>Please check your SAMS monitoring dashboard for more details.</p>");
        html.append("</div>");
        
        html.append("<div class='footer'>");
        html.append("This alert was generated by SAMS Monitoring System<br>");
        html.append("© 2024 SAMS Monitoring. All rights reserved.");
        html.append("</div>");
        
        html.append("</div>");
        html.append("</body></html>");
        
        return html.toString();
    }

    @Override
    public boolean testConnection(IntegrationConfig config) {
        try {
            EmailIntegrationConfig emailConfig = (EmailIntegrationConfig) config;
            
            // Create test notification
            NotificationRequest testRequest = new NotificationRequest();
            testRequest.setTitle("🧪 SAMS Monitoring - Connection Test");
            testRequest.setMessage("This is a test email to verify the email integration is working correctly.");
            testRequest.setSeverity(AlertSeverity.LOW);
            testRequest.setIntegrationConfig(emailConfig);
            
            NotificationResult result = sendNotification(testRequest);
            return result.isSuccess();
            
        } catch (Exception e) {
            logger.error("❌ Email connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getServiceType() {
        return "email";
    }
}
