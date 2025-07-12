/**
 * ☁️ Multi-Cloud Integration Services - Azure Monitor & Google Cloud Monitoring
 * Comprehensive cloud monitoring integrations with resource discovery and metrics collection
 */

package com.monitoring.cloud.service.azure;

import com.azure.core.credential.TokenCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.azure.resourcemanager.AzureResourceManager;
import com.azure.resourcemanager.monitor.MonitorManager;
import com.azure.resourcemanager.monitor.models.*;
import com.monitoring.cloud.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AzureMonitorService implements CloudMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(AzureMonitorService.class);

    @Override
    public CloudMetricsResponse getMetrics(CloudMetricsRequest request) {
        logger.info("☁️ Fetching Azure Monitor metrics for: {}", request.getResourceId());

        try {
            AzureCloudConfig config = (AzureCloudConfig) request.getCloudConfig();
            MonitorManager monitorManager = createMonitorManager(config);

            List<CloudMetric> metrics = new ArrayList<>();

            // Get Virtual Machine metrics
            if ("vm".equals(request.getResourceType())) {
                metrics.addAll(getVirtualMachineMetrics(monitorManager, request, config));
            }
            // Get SQL Database metrics
            else if ("sql".equals(request.getResourceType())) {
                metrics.addAll(getSqlDatabaseMetrics(monitorManager, request, config));
            }
            // Get App Service metrics
            else if ("webapp".equals(request.getResourceType())) {
                metrics.addAll(getAppServiceMetrics(monitorManager, request, config));
            }
            // Get Storage Account metrics
            else if ("storage".equals(request.getResourceType())) {
                metrics.addAll(getStorageAccountMetrics(monitorManager, request, config));
            }

            CloudMetricsResponse response = new CloudMetricsResponse();
            response.setMetrics(metrics);
            response.setProvider("azure");
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Retrieved {} Azure Monitor metrics", metrics.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error fetching Azure Monitor metrics: {}", e.getMessage(), e);
            return CloudMetricsResponse.failure("Error fetching Azure metrics: " + e.getMessage());
        }
    }

    private List<CloudMetric> getVirtualMachineMetrics(MonitorManager monitorManager, 
                                                      CloudMetricsRequest request, 
                                                      AzureCloudConfig config) {
        List<CloudMetric> metrics = new ArrayList<>();
        String resourceId = buildAzureResourceId(config, "Microsoft.Compute/virtualMachines", request.getResourceId());

        // Define VM metrics to collect
        List<String> vmMetrics = Arrays.asList(
            "Percentage CPU",
            "Network In Total",
            "Network Out Total",
            "Disk Read Bytes",
            "Disk Write Bytes",
            "Available Memory Bytes"
        );

        for (String metricName : vmMetrics) {
            try {
                MetricsQueryResult result = monitorManager.metrics()
                    .define()
                    .withResourceId(resourceId)
                    .withMetricNames(Arrays.asList(metricName))
                    .withTimespan(OffsetDateTime.of(request.getStartTime(), ZoneOffset.UTC),
                                 OffsetDateTime.of(request.getEndTime(), ZoneOffset.UTC))
                    .withInterval(java.time.Duration.ofMinutes(5))
                    .withAggregation(AggregationType.AVERAGE)
                    .execute();

                for (Metric metric : result.metrics()) {
                    for (TimeSeriesElement timeSeries : metric.timeseries()) {
                        for (MetricValue value : timeSeries.data()) {
                            if (value.average() != null) {
                                CloudMetric cloudMetric = new CloudMetric();
                                cloudMetric.setResourceId(request.getResourceId());
                                cloudMetric.setResourceType("vm");
                                cloudMetric.setMetricName(metricName.toLowerCase().replace(" ", "_"));
                                cloudMetric.setValue(value.average());
                                cloudMetric.setUnit(metric.unit().toString());
                                cloudMetric.setTimestamp(LocalDateTime.ofInstant(
                                    value.timeStamp().toInstant(), ZoneOffset.UTC));
                                cloudMetric.setProvider("azure");
                                cloudMetric.setNamespace("Microsoft.Compute/virtualMachines");
                                metrics.add(cloudMetric);
                            }
                        }
                    }
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching Azure VM metric {}: {}", metricName, e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getSqlDatabaseMetrics(MonitorManager monitorManager, 
                                                   CloudMetricsRequest request, 
                                                   AzureCloudConfig config) {
        List<CloudMetric> metrics = new ArrayList<>();
        String resourceId = buildAzureResourceId(config, "Microsoft.Sql/servers/databases", request.getResourceId());

        List<String> sqlMetrics = Arrays.asList(
            "cpu_percent",
            "dtu_consumption_percent",
            "storage_percent",
            "connection_successful",
            "connection_failed",
            "blocked_by_firewall"
        );

        for (String metricName : sqlMetrics) {
            try {
                MetricsQueryResult result = monitorManager.metrics()
                    .define()
                    .withResourceId(resourceId)
                    .withMetricNames(Arrays.asList(metricName))
                    .withTimespan(OffsetDateTime.of(request.getStartTime(), ZoneOffset.UTC),
                                 OffsetDateTime.of(request.getEndTime(), ZoneOffset.UTC))
                    .withInterval(java.time.Duration.ofMinutes(5))
                    .withAggregation(AggregationType.AVERAGE)
                    .execute();

                for (Metric metric : result.metrics()) {
                    for (TimeSeriesElement timeSeries : metric.timeseries()) {
                        for (MetricValue value : timeSeries.data()) {
                            if (value.average() != null) {
                                CloudMetric cloudMetric = new CloudMetric();
                                cloudMetric.setResourceId(request.getResourceId());
                                cloudMetric.setResourceType("sql");
                                cloudMetric.setMetricName(metricName);
                                cloudMetric.setValue(value.average());
                                cloudMetric.setUnit(metric.unit().toString());
                                cloudMetric.setTimestamp(LocalDateTime.ofInstant(
                                    value.timeStamp().toInstant(), ZoneOffset.UTC));
                                cloudMetric.setProvider("azure");
                                cloudMetric.setNamespace("Microsoft.Sql/servers/databases");
                                metrics.add(cloudMetric);
                            }
                        }
                    }
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching Azure SQL metric {}: {}", metricName, e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getAppServiceMetrics(MonitorManager monitorManager, 
                                                  CloudMetricsRequest request, 
                                                  AzureCloudConfig config) {
        List<CloudMetric> metrics = new ArrayList<>();
        String resourceId = buildAzureResourceId(config, "Microsoft.Web/sites", request.getResourceId());

        List<String> appServiceMetrics = Arrays.asList(
            "CpuTime",
            "Requests",
            "BytesReceived",
            "BytesSent",
            "Http2xx",
            "Http4xx",
            "Http5xx",
            "ResponseTime"
        );

        for (String metricName : appServiceMetrics) {
            try {
                MetricsQueryResult result = monitorManager.metrics()
                    .define()
                    .withResourceId(resourceId)
                    .withMetricNames(Arrays.asList(metricName))
                    .withTimespan(OffsetDateTime.of(request.getStartTime(), ZoneOffset.UTC),
                                 OffsetDateTime.of(request.getEndTime(), ZoneOffset.UTC))
                    .withInterval(java.time.Duration.ofMinutes(5))
                    .withAggregation(AggregationType.TOTAL)
                    .execute();

                for (Metric metric : result.metrics()) {
                    for (TimeSeriesElement timeSeries : metric.timeseries()) {
                        for (MetricValue value : timeSeries.data()) {
                            if (value.total() != null) {
                                CloudMetric cloudMetric = new CloudMetric();
                                cloudMetric.setResourceId(request.getResourceId());
                                cloudMetric.setResourceType("webapp");
                                cloudMetric.setMetricName(metricName.toLowerCase());
                                cloudMetric.setValue(value.total());
                                cloudMetric.setUnit(metric.unit().toString());
                                cloudMetric.setTimestamp(LocalDateTime.ofInstant(
                                    value.timeStamp().toInstant(), ZoneOffset.UTC));
                                cloudMetric.setProvider("azure");
                                cloudMetric.setNamespace("Microsoft.Web/sites");
                                metrics.add(cloudMetric);
                            }
                        }
                    }
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching Azure App Service metric {}: {}", metricName, e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getStorageAccountMetrics(MonitorManager monitorManager, 
                                                      CloudMetricsRequest request, 
                                                      AzureCloudConfig config) {
        List<CloudMetric> metrics = new ArrayList<>();
        String resourceId = buildAzureResourceId(config, "Microsoft.Storage/storageAccounts", request.getResourceId());

        List<String> storageMetrics = Arrays.asList(
            "UsedCapacity",
            "Transactions",
            "Ingress",
            "Egress",
            "SuccessServerLatency",
            "SuccessE2ELatency"
        );

        for (String metricName : storageMetrics) {
            try {
                MetricsQueryResult result = monitorManager.metrics()
                    .define()
                    .withResourceId(resourceId)
                    .withMetricNames(Arrays.asList(metricName))
                    .withTimespan(OffsetDateTime.of(request.getStartTime(), ZoneOffset.UTC),
                                 OffsetDateTime.of(request.getEndTime(), ZoneOffset.UTC))
                    .withInterval(java.time.Duration.ofMinutes(5))
                    .withAggregation(AggregationType.AVERAGE)
                    .execute();

                for (Metric metric : result.metrics()) {
                    for (TimeSeriesElement timeSeries : metric.timeseries()) {
                        for (MetricValue value : timeSeries.data()) {
                            if (value.average() != null) {
                                CloudMetric cloudMetric = new CloudMetric();
                                cloudMetric.setResourceId(request.getResourceId());
                                cloudMetric.setResourceType("storage");
                                cloudMetric.setMetricName(metricName.toLowerCase());
                                cloudMetric.setValue(value.average());
                                cloudMetric.setUnit(metric.unit().toString());
                                cloudMetric.setTimestamp(LocalDateTime.ofInstant(
                                    value.timeStamp().toInstant(), ZoneOffset.UTC));
                                cloudMetric.setProvider("azure");
                                cloudMetric.setNamespace("Microsoft.Storage/storageAccounts");
                                metrics.add(cloudMetric);
                            }
                        }
                    }
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching Azure Storage metric {}: {}", metricName, e.getMessage());
            }
        }

        return metrics;
    }

    @Override
    public CloudResourceDiscoveryResponse discoverResources(CloudResourceDiscoveryRequest request) {
        logger.info("🔍 Discovering Azure resources in subscription: {}", request.getSubscriptionId());

        try {
            AzureCloudConfig config = (AzureCloudConfig) request.getCloudConfig();
            AzureResourceManager azure = createAzureResourceManager(config);

            List<CloudResource> resources = new ArrayList<>();

            // Discover Virtual Machines
            resources.addAll(discoverVirtualMachines(azure));

            // Discover SQL Databases
            resources.addAll(discoverSqlDatabases(azure));

            // Discover App Services
            resources.addAll(discoverAppServices(azure));

            CloudResourceDiscoveryResponse response = new CloudResourceDiscoveryResponse();
            response.setResources(resources);
            response.setProvider("azure");
            response.setSubscriptionId(request.getSubscriptionId());
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Discovered {} Azure resources", resources.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error discovering Azure resources: {}", e.getMessage(), e);
            return CloudResourceDiscoveryResponse.failure("Error discovering Azure resources: " + e.getMessage());
        }
    }

    private List<CloudResource> discoverVirtualMachines(AzureResourceManager azure) {
        return azure.virtualMachines().list().stream()
                .map(vm -> {
                    CloudResource resource = new CloudResource();
                    resource.setResourceId(vm.name());
                    resource.setResourceType("vm");
                    resource.setResourceName(vm.name());
                    resource.setProvider("azure");
                    resource.setRegion(vm.region().name());
                    resource.setState(vm.powerState().toString());
                    resource.setInstanceType(vm.size().toString());
                    resource.setTags(vm.tags());
                    return resource;
                })
                .collect(Collectors.toList());
    }

    private List<CloudResource> discoverSqlDatabases(AzureResourceManager azure) {
        return azure.sqlServers().list().stream()
                .flatMap(server -> server.databases().list().stream()
                        .map(db -> {
                            CloudResource resource = new CloudResource();
                            resource.setResourceId(server.name() + "/" + db.name());
                            resource.setResourceType("sql");
                            resource.setResourceName(db.name());
                            resource.setProvider("azure");
                            resource.setRegion(server.region().name());
                            resource.setState("active");
                            resource.setTags(db.tags());
                            return resource;
                        }))
                .collect(Collectors.toList());
    }

    private List<CloudResource> discoverAppServices(AzureResourceManager azure) {
        return azure.webApps().list().stream()
                .map(app -> {
                    CloudResource resource = new CloudResource();
                    resource.setResourceId(app.name());
                    resource.setResourceType("webapp");
                    resource.setResourceName(app.name());
                    resource.setProvider("azure");
                    resource.setRegion(app.region().name());
                    resource.setState(app.state());
                    resource.setTags(app.tags());
                    return resource;
                })
                .collect(Collectors.toList());
    }

    private String buildAzureResourceId(AzureCloudConfig config, String resourceType, String resourceName) {
        return String.format("/subscriptions/%s/resourceGroups/%s/providers/%s/%s",
                config.getSubscriptionId(), config.getResourceGroupName(), resourceType, resourceName);
    }

    private MonitorManager createMonitorManager(AzureCloudConfig config) {
        TokenCredential credential = new ClientSecretCredentialBuilder()
                .clientId(config.getClientId())
                .clientSecret(config.getClientSecret())
                .tenantId(config.getTenantId())
                .build();

        return MonitorManager.authenticate(credential, config.getSubscriptionId());
    }

    private AzureResourceManager createAzureResourceManager(AzureCloudConfig config) {
        TokenCredential credential = new ClientSecretCredentialBuilder()
                .clientId(config.getClientId())
                .clientSecret(config.getClientSecret())
                .tenantId(config.getTenantId())
                .build();

        return AzureResourceManager.authenticate(credential, config.getSubscriptionId()).withDefaultSubscription();
    }

    @Override
    public boolean testConnection(CloudConfig config) {
        try {
            AzureCloudConfig azureConfig = (AzureCloudConfig) config;
            AzureResourceManager azure = createAzureResourceManager(azureConfig);
            
            // Test connection by listing resource groups
            azure.resourceGroups().list().stream().findFirst();
            return true;
            
        } catch (Exception e) {
            logger.error("❌ Azure connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "azure";
    }
}

/**
 * Google Cloud Monitoring service implementation
 */
package com.monitoring.cloud.service.gcp;

import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.monitoring.v3.*;
import com.google.monitoring.v3.*;
import com.monitoring.cloud.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class GoogleCloudMonitoringService implements CloudMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleCloudMonitoringService.class);

    @Override
    public CloudMetricsResponse getMetrics(CloudMetricsRequest request) {
        logger.info("☁️ Fetching Google Cloud Monitoring metrics for: {}", request.getResourceId());

        try {
            GcpCloudConfig config = (GcpCloudConfig) request.getCloudConfig();
            
            List<CloudMetric> metrics = new ArrayList<>();

            // Get Compute Engine metrics
            if ("gce".equals(request.getResourceType())) {
                metrics.addAll(getComputeEngineMetrics(config, request));
            }
            // Get Cloud SQL metrics
            else if ("cloudsql".equals(request.getResourceType())) {
                metrics.addAll(getCloudSqlMetrics(config, request));
            }
            // Get App Engine metrics
            else if ("appengine".equals(request.getResourceType())) {
                metrics.addAll(getAppEngineMetrics(config, request));
            }
            // Get Cloud Functions metrics
            else if ("functions".equals(request.getResourceType())) {
                metrics.addAll(getCloudFunctionsMetrics(config, request));
            }

            CloudMetricsResponse response = new CloudMetricsResponse();
            response.setMetrics(metrics);
            response.setProvider("gcp");
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Retrieved {} Google Cloud Monitoring metrics", metrics.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error fetching Google Cloud Monitoring metrics: {}", e.getMessage(), e);
            return CloudMetricsResponse.failure("Error fetching GCP metrics: " + e.getMessage());
        }
    }

    private List<CloudMetric> getComputeEngineMetrics(GcpCloudConfig config, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();

        try (MetricServiceClient client = createMetricServiceClient(config)) {
            String projectName = ProjectName.of(config.getProjectId()).toString();

            // Define GCE metrics to collect
            Map<String, String> gceMetrics = Map.of(
                "compute.googleapis.com/instance/cpu/utilization", "percent",
                "compute.googleapis.com/instance/network/received_bytes_count", "bytes",
                "compute.googleapis.com/instance/network/sent_bytes_count", "bytes",
                "compute.googleapis.com/instance/disk/read_bytes_count", "bytes",
                "compute.googleapis.com/instance/disk/write_bytes_count", "bytes"
            );

            for (Map.Entry<String, String> metricEntry : gceMetrics.entrySet()) {
                try {
                    ListTimeSeriesRequest timeSeriesRequest = ListTimeSeriesRequest.newBuilder()
                            .setName(projectName)
                            .setFilter(String.format("metric.type=\"%s\" AND resource.label.instance_id=\"%s\"",
                                    metricEntry.getKey(), request.getResourceId()))
                            .setInterval(TimeInterval.newBuilder()
                                    .setStartTime(com.google.protobuf.Timestamp.newBuilder()
                                            .setSeconds(request.getStartTime().toEpochSecond(ZoneOffset.UTC)))
                                    .setEndTime(com.google.protobuf.Timestamp.newBuilder()
                                            .setSeconds(request.getEndTime().toEpochSecond(ZoneOffset.UTC))))
                            .setView(ListTimeSeriesRequest.TimeSeriesView.FULL)
                            .build();

                    MetricServiceClient.ListTimeSeriesPagedResponse response = client.listTimeSeries(timeSeriesRequest);

                    for (TimeSeries timeSeries : response.iterateAll()) {
                        for (Point point : timeSeries.getPointsList()) {
                            CloudMetric metric = new CloudMetric();
                            metric.setResourceId(request.getResourceId());
                            metric.setResourceType("gce");
                            metric.setMetricName(extractMetricName(metricEntry.getKey()));
                            metric.setValue(point.getValue().getDoubleValue());
                            metric.setUnit(metricEntry.getValue());
                            metric.setTimestamp(LocalDateTime.ofEpochSecond(
                                    point.getInterval().getEndTime().getSeconds(), 0, ZoneOffset.UTC));
                            metric.setProvider("gcp");
                            metric.setNamespace("compute.googleapis.com");
                            metrics.add(metric);
                        }
                    }

                } catch (Exception e) {
                    logger.error("❌ Error fetching GCE metric {}: {}", metricEntry.getKey(), e.getMessage());
                }
            }

        } catch (Exception e) {
            logger.error("❌ Error creating GCP Monitoring client: {}", e.getMessage(), e);
        }

        return metrics;
    }

    private List<CloudMetric> getCloudSqlMetrics(GcpCloudConfig config, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();

        try (MetricServiceClient client = createMetricServiceClient(config)) {
            String projectName = ProjectName.of(config.getProjectId()).toString();

            Map<String, String> sqlMetrics = Map.of(
                "cloudsql.googleapis.com/database/cpu/utilization", "percent",
                "cloudsql.googleapis.com/database/memory/utilization", "percent",
                "cloudsql.googleapis.com/database/disk/utilization", "percent",
                "cloudsql.googleapis.com/database/network/connections", "count"
            );

            for (Map.Entry<String, String> metricEntry : sqlMetrics.entrySet()) {
                try {
                    ListTimeSeriesRequest timeSeriesRequest = ListTimeSeriesRequest.newBuilder()
                            .setName(projectName)
                            .setFilter(String.format("metric.type=\"%s\" AND resource.label.database_id=\"%s\"",
                                    metricEntry.getKey(), request.getResourceId()))
                            .setInterval(TimeInterval.newBuilder()
                                    .setStartTime(com.google.protobuf.Timestamp.newBuilder()
                                            .setSeconds(request.getStartTime().toEpochSecond(ZoneOffset.UTC)))
                                    .setEndTime(com.google.protobuf.Timestamp.newBuilder()
                                            .setSeconds(request.getEndTime().toEpochSecond(ZoneOffset.UTC))))
                            .build();

                    MetricServiceClient.ListTimeSeriesPagedResponse response = client.listTimeSeries(timeSeriesRequest);

                    for (TimeSeries timeSeries : response.iterateAll()) {
                        for (Point point : timeSeries.getPointsList()) {
                            CloudMetric metric = new CloudMetric();
                            metric.setResourceId(request.getResourceId());
                            metric.setResourceType("cloudsql");
                            metric.setMetricName(extractMetricName(metricEntry.getKey()));
                            metric.setValue(point.getValue().getDoubleValue());
                            metric.setUnit(metricEntry.getValue());
                            metric.setTimestamp(LocalDateTime.ofEpochSecond(
                                    point.getInterval().getEndTime().getSeconds(), 0, ZoneOffset.UTC));
                            metric.setProvider("gcp");
                            metric.setNamespace("cloudsql.googleapis.com");
                            metrics.add(metric);
                        }
                    }

                } catch (Exception e) {
                    logger.error("❌ Error fetching Cloud SQL metric {}: {}", metricEntry.getKey(), e.getMessage());
                }
            }

        } catch (Exception e) {
            logger.error("❌ Error creating GCP Monitoring client: {}", e.getMessage(), e);
        }

        return metrics;
    }

    private List<CloudMetric> getAppEngineMetrics(GcpCloudConfig config, CloudMetricsRequest request) {
        // App Engine metrics implementation
        return new ArrayList<>();
    }

    private List<CloudMetric> getCloudFunctionsMetrics(GcpCloudConfig config, CloudMetricsRequest request) {
        // Cloud Functions metrics implementation
        return new ArrayList<>();
    }

    @Override
    public CloudResourceDiscoveryResponse discoverResources(CloudResourceDiscoveryRequest request) {
        logger.info("🔍 Discovering Google Cloud resources in project: {}", request.getProjectId());

        try {
            GcpCloudConfig config = (GcpCloudConfig) request.getCloudConfig();
            
            List<CloudResource> resources = new ArrayList<>();

            // Resource discovery would be implemented here using Google Cloud APIs
            // This would involve using Compute Engine, Cloud SQL, App Engine APIs

            CloudResourceDiscoveryResponse response = new CloudResourceDiscoveryResponse();
            response.setResources(resources);
            response.setProvider("gcp");
            response.setProjectId(request.getProjectId());
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Discovered {} Google Cloud resources", resources.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error discovering Google Cloud resources: {}", e.getMessage(), e);
            return CloudResourceDiscoveryResponse.failure("Error discovering GCP resources: " + e.getMessage());
        }
    }

    private MetricServiceClient createMetricServiceClient(GcpCloudConfig config) throws Exception {
        ServiceAccountCredentials credentials = ServiceAccountCredentials.fromStream(
                new ByteArrayInputStream(config.getServiceAccountKey().getBytes()));

        return MetricServiceClient.create(
                MetricServiceSettings.newBuilder()
                        .setCredentialsProvider(() -> credentials)
                        .build());
    }

    private String extractMetricName(String fullMetricType) {
        String[] parts = fullMetricType.split("/");
        return parts[parts.length - 1];
    }

    @Override
    public boolean testConnection(CloudConfig config) {
        try {
            GcpCloudConfig gcpConfig = (GcpCloudConfig) config;
            
            try (MetricServiceClient client = createMetricServiceClient(gcpConfig)) {
                String projectName = ProjectName.of(gcpConfig.getProjectId()).toString();
                
                // Test connection by listing metric descriptors
                ListMetricDescriptorsRequest request = ListMetricDescriptorsRequest.newBuilder()
                        .setName(projectName)
                        .setPageSize(1)
                        .build();
                
                client.listMetricDescriptors(request);
                return true;
            }
            
        } catch (Exception e) {
            logger.error("❌ Google Cloud connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "gcp";
    }
}
