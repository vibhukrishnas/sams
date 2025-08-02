package com.sams.service;

import com.sams.entity.Server;
import com.sams.entity.SystemMetric;
import com.sams.repository.ServerRepository;
import com.sams.repository.SystemMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

/**
 * Cloud API Integration Service for Client's External APIs
 * Supports multiple cloud providers and custom API endpoints
 */
@Service
public class CloudApiIntegrationService {
    
    private static final Logger logger = LoggerFactory.getLogger(CloudApiIntegrationService.class);
    
    @Autowired
    private ServerRepository serverRepository;
    
    @Autowired
    private SystemMetricRepository systemMetricRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Get comprehensive server details from client's cloud API
     */
    public Map<String, Object> getServerDetailsFromCloudApi(Server server) {
        Map<String, Object> serverDetails = new HashMap<>();
        
        try {
            // Determine cloud provider type from server configuration
            String cloudProvider = determineCloudProvider(server);
            
            switch (cloudProvider.toLowerCase()) {
                case "aws":
                    serverDetails = getAwsServerDetails(server);
                    break;
                case "azure":
                    serverDetails = getAzureServerDetails(server);
                    break;
                case "gcp":
                    serverDetails = getGcpServerDetails(server);
                    break;
                case "custom":
                    serverDetails = getCustomApiServerDetails(server);
                    break;
                default:
                    serverDetails = getGenericCloudServerDetails(server);
            }
            
            // Add common server information
            enhanceWithCommonServerInfo(serverDetails, server);
            
            logger.info("Retrieved detailed server information for {} from {} API", 
                       server.getName(), cloudProvider);
            
        } catch (Exception e) {
            logger.error("Failed to get server details from cloud API for {}: {}", 
                        server.getName(), e.getMessage());
            serverDetails = getFallbackServerDetails(server);
        }
        
        return serverDetails;
    }
    
    /**
     * AWS EC2/ECS API Integration
     */
    private Map<String, Object> getAwsServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        try {
            // AWS API endpoint (replace with client's actual endpoint)
            String awsApiUrl = buildAwsApiUrl(server);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + getAwsApiKey());
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                awsApiUrl, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> awsData = response.getBody();
                
                // Parse AWS-specific data
                details.put("instance_id", awsData.get("InstanceId"));
                details.put("instance_type", awsData.get("InstanceType"));
                details.put("availability_zone", awsData.get("Placement"));
                details.put("vpc_id", awsData.get("VpcId"));
                details.put("subnet_id", awsData.get("SubnetId"));
                details.put("security_groups", awsData.get("SecurityGroups"));
                details.put("public_ip", awsData.get("PublicIpAddress"));
                details.put("private_ip", awsData.get("PrivateIpAddress"));
                details.put("launch_time", awsData.get("LaunchTime"));
                details.put("state", awsData.get("State"));
                details.put("monitoring", awsData.get("Monitoring"));
                details.put("tags", awsData.get("Tags"));
                
                // Get CloudWatch metrics
                details.put("cloudwatch_metrics", getAwsCloudWatchMetrics(server));
            }
            
        } catch (Exception e) {
            logger.error("Failed to get AWS server details: {}", e.getMessage());
        }
        
        details.put("cloud_provider", "AWS");
        return details;
    }
    
    /**
     * Azure VM/Container API Integration
     */
    private Map<String, Object> getAzureServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        try {
            String azureApiUrl = buildAzureApiUrl(server);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + getAzureApiKey());
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                azureApiUrl, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> azureData = response.getBody();
                
                // Parse Azure-specific data
                details.put("vm_id", azureData.get("vmId"));
                details.put("vm_size", azureData.get("hardwareProfile"));
                details.put("resource_group", azureData.get("resourceGroup"));
                details.put("location", azureData.get("location"));
                details.put("provisioning_state", azureData.get("provisioningState"));
                details.put("power_state", azureData.get("powerState"));
                details.put("network_profile", azureData.get("networkProfile"));
                details.put("storage_profile", azureData.get("storageProfile"));
                details.put("os_profile", azureData.get("osProfile"));
                details.put("tags", azureData.get("tags"));
                
                // Get Azure Monitor metrics
                details.put("azure_metrics", getAzureMonitorMetrics(server));
            }
            
        } catch (Exception e) {
            logger.error("Failed to get Azure server details: {}", e.getMessage());
        }
        
        details.put("cloud_provider", "Azure");
        return details;
    }
    
    /**
     * Google Cloud Platform API Integration
     */
    private Map<String, Object> getGcpServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        try {
            String gcpApiUrl = buildGcpApiUrl(server);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + getGcpApiKey());
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                gcpApiUrl, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> gcpData = response.getBody();
                
                // Parse GCP-specific data
                details.put("instance_id", gcpData.get("id"));
                details.put("machine_type", gcpData.get("machineType"));
                details.put("zone", gcpData.get("zone"));
                details.put("status", gcpData.get("status"));
                details.put("network_interfaces", gcpData.get("networkInterfaces"));
                details.put("disks", gcpData.get("disks"));
                details.put("metadata", gcpData.get("metadata"));
                details.put("labels", gcpData.get("labels"));
                details.put("creation_timestamp", gcpData.get("creationTimestamp"));
                
                // Get Stackdriver metrics
                details.put("stackdriver_metrics", getGcpStackdriverMetrics(server));
            }
            
        } catch (Exception e) {
            logger.error("Failed to get GCP server details: {}", e.getMessage());
        }
        
        details.put("cloud_provider", "GCP");
        return details;
    }
    
    /**
     * Custom API Integration for client's proprietary systems
     */
    private Map<String, Object> getCustomApiServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        try {
            // Client's custom API endpoint
            String customApiUrl = buildCustomApiUrl(server);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + getCustomApiKey());
            headers.set("X-API-Version", "v2");
            headers.set("Content-Type", "application/json");
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                customApiUrl, HttpMethod.GET, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> customData = response.getBody();
                
                // Parse custom API data structure
                details.put("server_id", customData.get("serverId"));
                details.put("server_name", customData.get("serverName"));
                details.put("environment", customData.get("environment"));
                details.put("application_stack", customData.get("applicationStack"));
                details.put("deployment_info", customData.get("deploymentInfo"));
                details.put("configuration", customData.get("configuration"));
                details.put("dependencies", customData.get("dependencies"));
                details.put("health_checks", customData.get("healthChecks"));
                details.put("performance_metrics", customData.get("performanceMetrics"));
                details.put("logs", customData.get("logs"));
                details.put("alerts", customData.get("alerts"));
                details.put("custom_metadata", customData.get("metadata"));
            }
            
        } catch (Exception e) {
            logger.error("Failed to get custom API server details: {}", e.getMessage());
        }
        
        details.put("cloud_provider", "Custom");
        return details;
    }
    
    /**
     * Generic cloud API integration for unknown providers
     */
    private Map<String, Object> getGenericCloudServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        try {
            // Try common REST API patterns
            String[] commonEndpoints = {
                "/api/v1/servers/" + server.getId(),
                "/api/servers/" + server.getName(),
                "/servers/" + server.getId() + "/details",
                "/instances/" + server.getName()
            };
            
            for (String endpoint : commonEndpoints) {
                try {
                    String apiUrl = "http://" + server.getHost() + ":" + server.getPort() + endpoint;
                    
                    ResponseEntity<Map> response = restTemplate.getForEntity(apiUrl, Map.class);
                    
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        details.putAll(response.getBody());
                        break;
                    }
                } catch (Exception e) {
                    // Continue to next endpoint
                    logger.debug("Endpoint {} failed: {}", endpoint, e.getMessage());
                }
            }
            
        } catch (Exception e) {
            logger.error("Failed to get generic server details: {}", e.getMessage());
        }
        
        details.put("cloud_provider", "Generic");
        return details;
    }
    
    /**
     * Enhance server details with common information
     */
    private void enhanceWithCommonServerInfo(Map<String, Object> details, Server server) {
        // Basic server information
        details.put("server_basic_info", Map.of(
            "id", server.getId(),
            "name", server.getName(),
            "host", server.getHost(),
            "port", server.getPort(),
            "status", server.getStatus(),
            "server_type", server.getServerType(),
            "operating_system", server.getOperatingSystem(),
            "version", server.getVersion(),
            "description", server.getDescription()
        ));
        
        // Current metrics
        details.put("current_metrics", Map.of(
            "cpu_usage", server.getCpuUsage() != null ? server.getCpuUsage() : 0.0,
            "memory_usage", server.getMemoryUsage() != null ? server.getMemoryUsage() : 0.0,
            "disk_usage", server.getDiskUsage() != null ? server.getDiskUsage() : 0.0,
            "uptime", server.getUptime() != null ? server.getUptime() : 0L,
            "network_in", server.getNetworkIn() != null ? server.getNetworkIn() : 0L,
            "network_out", server.getNetworkOut() != null ? server.getNetworkOut() : 0L
        ));
        
        // Timestamps
        details.put("timestamps", Map.of(
            "created_at", server.getCreatedAt(),
            "updated_at", server.getUpdatedAt(),
            "last_check", server.getLastCheck(),
            "last_ping", server.getLastPing(),
            "current_time", LocalDateTime.now()
        ));
        
        // Historical metrics (last 24 hours)
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<SystemMetric> historicalMetrics = systemMetricRepository
            .findByServerAndTimestampBetweenOrderByTimestampDesc(server, since, LocalDateTime.now());
        
        details.put("historical_metrics", historicalMetrics);
        details.put("metrics_count", historicalMetrics.size());
    }
    
    /**
     * Fallback server details when API calls fail
     */
    private Map<String, Object> getFallbackServerDetails(Server server) {
        Map<String, Object> details = new HashMap<>();
        
        details.put("server_basic_info", Map.of(
            "id", server.getId(),
            "name", server.getName(),
            "host", server.getHost(),
            "port", server.getPort(),
            "status", server.getStatus()
        ));
        
        details.put("error", "Unable to fetch detailed information from cloud API");
        details.put("fallback_mode", true);
        details.put("cloud_provider", "Unknown");
        
        return details;
    }
    
    // Helper methods for API URL construction
    private String buildAwsApiUrl(Server server) {
        return String.format("https://ec2.amazonaws.com/api/v1/instances/%s", server.getName());
    }
    
    private String buildAzureApiUrl(Server server) {
        return String.format("https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Compute/virtualMachines/%s", server.getName());
    }
    
    private String buildGcpApiUrl(Server server) {
        return String.format("https://compute.googleapis.com/compute/v1/projects/{project}/zones/{zone}/instances/%s", server.getName());
    }
    
    private String buildCustomApiUrl(Server server) {
        // Client-specific API URL pattern
        return String.format("https://api.client-cloud.com/v2/servers/%s/details", server.getName());
    }
    
    // Helper methods for API keys (should be configurable)
    private String getAwsApiKey() {
        return System.getenv("AWS_API_KEY"); // Configure in environment
    }
    
    private String getAzureApiKey() {
        return System.getenv("AZURE_API_KEY");
    }
    
    private String getGcpApiKey() {
        return System.getenv("GCP_API_KEY");
    }
    
    private String getCustomApiKey() {
        return System.getenv("CUSTOM_API_KEY");
    }
    
    // Helper methods for determining cloud provider
    private String determineCloudProvider(Server server) {
        // Logic to determine cloud provider based on server configuration
        if (server.getHost().contains("amazonaws.com") || server.getDescription().toLowerCase().contains("aws")) {
            return "aws";
        } else if (server.getHost().contains("azure.com") || server.getDescription().toLowerCase().contains("azure")) {
            return "azure";
        } else if (server.getHost().contains("googleapis.com") || server.getDescription().toLowerCase().contains("gcp")) {
            return "gcp";
        } else if (server.getDescription().toLowerCase().contains("custom")) {
            return "custom";
        }
        return "generic";
    }
    
    // Cloud-specific metric collection methods
    private Map<String, Object> getAwsCloudWatchMetrics(Server server) {
        // Implementation for AWS CloudWatch metrics
        return Map.of("source", "CloudWatch", "metrics", new ArrayList<>());
    }
    
    private Map<String, Object> getAzureMonitorMetrics(Server server) {
        // Implementation for Azure Monitor metrics
        return Map.of("source", "Azure Monitor", "metrics", new ArrayList<>());
    }
    
    private Map<String, Object> getGcpStackdriverMetrics(Server server) {
        // Implementation for GCP Stackdriver metrics
        return Map.of("source", "Stackdriver", "metrics", new ArrayList<>());
    }
}
