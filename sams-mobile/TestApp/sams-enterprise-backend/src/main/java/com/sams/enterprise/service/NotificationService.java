package com.sams.enterprise.service;

import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.User;
import com.sams.enterprise.entity.Server;
import com.slack.api.Slack;
import com.slack.api.methods.SlackApiException;
import com.slack.api.methods.request.chat.ChatPostMessageRequest;
import com.slack.api.webhook.Payload;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Enterprise Notification Service with Third-party Integrations
 * Supports: Slack, Microsoft Teams, SMS (Twilio), Email
 */
@Service
public class NotificationService {

    // Slack Configuration
    @Value("${integrations.slack.webhook-url:}")
    private String slackWebhookUrl;

    @Value("${integrations.slack.bot-token:}")
    private String slackBotToken;

    // Teams Configuration
    @Value("${integrations.teams.webhook-url:}")
    private String teamsWebhookUrl;

    // Twilio Configuration
    @Value("${integrations.twilio.account-sid:}")
    private String twilioAccountSid;

    @Value("${integrations.twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${integrations.twilio.from-number:}")
    private String twilioFromNumber;

    private final JavaMailSender mailSender;
    private final RestTemplate restTemplate;
    private final Slack slack;

    public NotificationService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        this.restTemplate = new RestTemplate();
        this.slack = Slack.getInstance();
        
        // Initialize Twilio
        if (twilioAccountSid != null && twilioAuthToken != null) {
            Twilio.init(twilioAccountSid, twilioAuthToken);
        }
    }

    /**
     * Send critical alert notification to all channels
     */
    public void sendCriticalAlertNotification(Alert alert) {
        String message = formatCriticalAlertMessage(alert);
        
        // Send to all channels asynchronously
        CompletableFuture.allOf(
            CompletableFuture.runAsync(() -> sendSlackNotification(message, "#critical-alerts")),
            CompletableFuture.runAsync(() -> sendTeamsNotification(message)),
            CompletableFuture.runAsync(() -> sendEmailNotification(
                "admin@company.com", 
                "🚨 CRITICAL ALERT: " + alert.getTitle(), 
                message
            )),
            CompletableFuture.runAsync(() -> sendSMSNotification(
                "+1234567890", // Admin phone number
                "CRITICAL ALERT: " + alert.getTitle()
            ))
        );
    }

    /**
     * Send alert escalation notification
     */
    public void sendEscalationNotification(Alert alert) {
        String message = formatEscalationMessage(alert);
        
        CompletableFuture.allOf(
            CompletableFuture.runAsync(() -> sendSlackNotification(message, "#escalations")),
            CompletableFuture.runAsync(() -> sendTeamsNotification(message)),
            CompletableFuture.runAsync(() -> sendEmailNotification(
                "escalation@company.com",
                "⚠️ ALERT ESCALATION: " + alert.getTitle(),
                message
            ))
        );
    }

    /**
     * Send login notification
     */
    public void sendLoginNotification(User user, String ipAddress, String userAgent) {
        String message = String.format(
            "🔐 User %s (%s) logged in from IP: %s\nUser Agent: %s\nTime: %s",
            user.getUsername(),
            user.getFullName(),
            ipAddress,
            userAgent,
            java.time.LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );

        // Send to security channel
        sendSlackNotification(message, "#security-logs");
    }

    /**
     * Send welcome notification for new users
     */
    public void sendWelcomeNotification(User user) {
        String subject = "Welcome to SAMS Enterprise";
        String message = String.format(
            "Welcome to SAMS Enterprise, %s!\n\n" +
            "Your account has been created successfully.\n" +
            "Username: %s\n" +
            "Email: %s\n\n" +
            "Please contact your administrator for initial setup and training.\n\n" +
            "Best regards,\nSAMS Enterprise Team",
            user.getFullName(),
            user.getUsername(),
            user.getEmail()
        );

        sendEmailNotification(user.getEmail(), subject, message);
    }

    /**
     * Send Slack notification
     */
    public void sendSlackNotification(String message, String channel) {
        if (slackWebhookUrl == null || slackWebhookUrl.isEmpty()) {
            return;
        }

        try {
            if (slackBotToken != null && !slackBotToken.isEmpty()) {
                // Use Slack API with bot token
                ChatPostMessageRequest request = ChatPostMessageRequest.builder()
                    .channel(channel)
                    .text(message)
                    .build();

                slack.methods(slackBotToken).chatPostMessage(request);
            } else {
                // Use webhook
                Payload payload = Payload.builder()
                    .channel(channel)
                    .text(message)
                    .username("SAMS Enterprise")
                    .iconEmoji(":warning:")
                    .build();

                slack.send(slackWebhookUrl, payload);
            }
        } catch (IOException | SlackApiException e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to send Slack notification: " + e.getMessage());
        }
    }

    /**
     * Send Microsoft Teams notification
     */
    public void sendTeamsNotification(String message) {
        if (teamsWebhookUrl == null || teamsWebhookUrl.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("text", message);
            payload.put("title", "SAMS Enterprise Alert");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(teamsWebhookUrl, request, String.class);

        } catch (Exception e) {
            System.err.println("Failed to send Teams notification: " + e.getMessage());
        }
    }

    /**
     * Send SMS notification via Twilio
     */
    public void sendSMSNotification(String toPhoneNumber, String message) {
        if (twilioAccountSid == null || twilioAuthToken == null || twilioFromNumber == null) {
            return;
        }

        try {
            Message.creator(
                new PhoneNumber(toPhoneNumber),
                new PhoneNumber(twilioFromNumber),
                message
            ).create();

        } catch (Exception e) {
            System.err.println("Failed to send SMS notification: " + e.getMessage());
        }
    }

    /**
     * Send email notification
     */
    public void sendEmailNotification(String toEmail, String subject, String message) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(toEmail);
            mailMessage.setSubject(subject);
            mailMessage.setText(message);
            mailMessage.setFrom("noreply@sams-enterprise.com");

            mailSender.send(mailMessage);

        } catch (Exception e) {
            System.err.println("Failed to send email notification: " + e.getMessage());
        }
    }

    /**
     * Send server status notification
     */
    public void sendServerStatusNotification(Server server, String status) {
        String message = String.format(
            "🖥️ Server Status Change\n" +
            "Server: %s (%s)\n" +
            "Status: %s\n" +
            "Time: %s",
            server.getHostname(),
            server.getIpAddress(),
            status,
            java.time.LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );

        sendSlackNotification(message, "#server-status");
        
        if ("OFFLINE".equals(status) || "CRITICAL".equals(status)) {
            sendEmailNotification(
                "ops@company.com",
                "🚨 Server Status Alert: " + server.getHostname(),
                message
            );
        }
    }

    /**
     * Format critical alert message
     */
    private String formatCriticalAlertMessage(Alert alert) {
        return String.format(
            "🚨 CRITICAL ALERT 🚨\n\n" +
            "Title: %s\n" +
            "Server: %s\n" +
            "Description: %s\n" +
            "Severity: %s\n" +
            "Source: %s\n" +
            "Time: %s\n" +
            "Alert ID: %d",
            alert.getTitle(),
            alert.getServer() != null ? alert.getServer().getHostname() : "Unknown",
            alert.getDescription(),
            alert.getSeverity(),
            alert.getSource(),
            alert.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            alert.getId()
        );
    }

    /**
     * Format escalation message
     */
    private String formatEscalationMessage(Alert alert) {
        return String.format(
            "⚠️ ALERT ESCALATION ⚠️\n\n" +
            "Alert: %s\n" +
            "Server: %s\n" +
            "Escalation Level: %d\n" +
            "Time Since Created: %s\n" +
            "Current Status: %s\n" +
            "Alert ID: %d",
            alert.getTitle(),
            alert.getServer() != null ? alert.getServer().getHostname() : "Unknown",
            alert.getEscalationLevel(),
            java.time.Duration.between(alert.getCreatedAt(), java.time.LocalDateTime.now()).toString(),
            alert.getStatus(),
            alert.getId()
        );
    }

    /**
     * Send bulk notification to multiple channels
     */
    public void sendBulkNotification(String message, String subject, 
                                   boolean includeSlack, boolean includeTeams, 
                                   boolean includeEmail, boolean includeSMS,
                                   String emailRecipient, String smsRecipient) {
        
        CompletableFuture<Void>[] futures = new CompletableFuture[4];
        int index = 0;

        if (includeSlack) {
            futures[index++] = CompletableFuture.runAsync(() -> 
                sendSlackNotification(message, "#general"));
        }

        if (includeTeams) {
            futures[index++] = CompletableFuture.runAsync(() -> 
                sendTeamsNotification(message));
        }

        if (includeEmail && emailRecipient != null) {
            futures[index++] = CompletableFuture.runAsync(() -> 
                sendEmailNotification(emailRecipient, subject, message));
        }

        if (includeSMS && smsRecipient != null) {
            futures[index++] = CompletableFuture.runAsync(() -> 
                sendSMSNotification(smsRecipient, message));
        }

        // Wait for all notifications to complete
        CompletableFuture.allOf(java.util.Arrays.copyOf(futures, index));
    }
}
