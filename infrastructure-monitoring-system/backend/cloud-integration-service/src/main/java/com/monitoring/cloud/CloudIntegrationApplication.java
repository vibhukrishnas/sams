/**
 * ☁️ Cloud Integration Service - Multi-Cloud Monitoring Platform
 * Comprehensive integration with AWS CloudWatch, Azure Monitor, and Google Cloud Monitoring
 */

package com.monitoring.cloud;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
public class CloudIntegrationApplication {

    public static void main(String[] args) {
        SpringApplication.run(CloudIntegrationApplication.class, args);
    }
}

/**
 * AWS CloudWatch integration service
 */
package com.monitoring.cloud.service.aws;

import com.monitoring.cloud.model.*;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchClient;
import software.amazon.awssdk.services.cloudwatch.model.*;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AwsCloudWatchService implements CloudMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(AwsCloudWatchService.class);

    @Override
    public CloudMetricsResponse getMetrics(CloudMetricsRequest request) {
        logger.info("☁️ Fetching AWS CloudWatch metrics for: {}", request.getResourceId());

        try {
            AwsCloudConfig config = (AwsCloudConfig) request.getCloudConfig();
            CloudWatchClient cloudWatch = createCloudWatchClient(config);

            List<CloudMetric> metrics = new ArrayList<>();

            // Get EC2 instance metrics
            if ("ec2".equals(request.getResourceType())) {
                metrics.addAll(getEc2Metrics(cloudWatch, request));
            }
            // Get RDS metrics
            else if ("rds".equals(request.getResourceType())) {
                metrics.addAll(getRdsMetrics(cloudWatch, request));
            }
            // Get ELB metrics
            else if ("elb".equals(request.getResourceType())) {
                metrics.addAll(getElbMetrics(cloudWatch, request));
            }
            // Get Lambda metrics
            else if ("lambda".equals(request.getResourceType())) {
                metrics.addAll(getLambdaMetrics(cloudWatch, request));
            }

            CloudMetricsResponse response = new CloudMetricsResponse();
            response.setMetrics(metrics);
            response.setProvider("aws");
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Retrieved {} AWS CloudWatch metrics", metrics.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error fetching AWS CloudWatch metrics: {}", e.getMessage(), e);
            return CloudMetricsResponse.failure("Error fetching AWS metrics: " + e.getMessage());
        }
    }

    private List<CloudMetric> getEc2Metrics(CloudWatchClient cloudWatch, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();
        String instanceId = request.getResourceId();

        // Define EC2 metrics to collect
        Map<String, String> ec2Metrics = Map.of(
            "CPUUtilization", "percent",
            "NetworkIn", "bytes",
            "NetworkOut", "bytes",
            "DiskReadBytes", "bytes",
            "DiskWriteBytes", "bytes",
            "StatusCheckFailed", "count"
        );

        for (Map.Entry<String, String> metricEntry : ec2Metrics.entrySet()) {
            try {
                GetMetricStatisticsRequest metricRequest = GetMetricStatisticsRequest.builder()
                    .namespace("AWS/EC2")
                    .metricName(metricEntry.getKey())
                    .dimensions(Dimension.builder()
                        .name("InstanceId")
                        .value(instanceId)
                        .build())
                    .startTime(request.getStartTime().toInstant(ZoneOffset.UTC))
                    .endTime(request.getEndTime().toInstant(ZoneOffset.UTC))
                    .period(300) // 5 minutes
                    .statistics(Statistic.AVERAGE, Statistic.MAXIMUM)
                    .build();

                GetMetricStatisticsResponse response = cloudWatch.getMetricStatistics(metricRequest);

                for (Datapoint datapoint : response.datapoints()) {
                    CloudMetric metric = new CloudMetric();
                    metric.setResourceId(instanceId);
                    metric.setResourceType("ec2");
                    metric.setMetricName(metricEntry.getKey().toLowerCase());
                    metric.setValue(datapoint.average());
                    metric.setMaxValue(datapoint.maximum());
                    metric.setUnit(metricEntry.getValue());
                    metric.setTimestamp(LocalDateTime.ofInstant(datapoint.timestamp(), ZoneOffset.UTC));
                    metric.setProvider("aws");
                    metric.setNamespace("AWS/EC2");
                    metrics.add(metric);
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching EC2 metric {}: {}", metricEntry.getKey(), e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getRdsMetrics(CloudWatchClient cloudWatch, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();
        String dbInstanceId = request.getResourceId();

        Map<String, String> rdsMetrics = Map.of(
            "CPUUtilization", "percent",
            "DatabaseConnections", "count",
            "FreeableMemory", "bytes",
            "ReadLatency", "seconds",
            "WriteLatency", "seconds",
            "ReadIOPS", "count/second",
            "WriteIOPS", "count/second"
        );

        for (Map.Entry<String, String> metricEntry : rdsMetrics.entrySet()) {
            try {
                GetMetricStatisticsRequest metricRequest = GetMetricStatisticsRequest.builder()
                    .namespace("AWS/RDS")
                    .metricName(metricEntry.getKey())
                    .dimensions(Dimension.builder()
                        .name("DBInstanceIdentifier")
                        .value(dbInstanceId)
                        .build())
                    .startTime(request.getStartTime().toInstant(ZoneOffset.UTC))
                    .endTime(request.getEndTime().toInstant(ZoneOffset.UTC))
                    .period(300)
                    .statistics(Statistic.AVERAGE, Statistic.MAXIMUM)
                    .build();

                GetMetricStatisticsResponse response = cloudWatch.getMetricStatistics(metricRequest);

                for (Datapoint datapoint : response.datapoints()) {
                    CloudMetric metric = new CloudMetric();
                    metric.setResourceId(dbInstanceId);
                    metric.setResourceType("rds");
                    metric.setMetricName(metricEntry.getKey().toLowerCase());
                    metric.setValue(datapoint.average());
                    metric.setMaxValue(datapoint.maximum());
                    metric.setUnit(metricEntry.getValue());
                    metric.setTimestamp(LocalDateTime.ofInstant(datapoint.timestamp(), ZoneOffset.UTC));
                    metric.setProvider("aws");
                    metric.setNamespace("AWS/RDS");
                    metrics.add(metric);
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching RDS metric {}: {}", metricEntry.getKey(), e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getElbMetrics(CloudWatchClient cloudWatch, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();
        String loadBalancerName = request.getResourceId();

        Map<String, String> elbMetrics = Map.of(
            "RequestCount", "count",
            "Latency", "seconds",
            "HTTPCode_Target_2XX_Count", "count",
            "HTTPCode_Target_4XX_Count", "count",
            "HTTPCode_Target_5XX_Count", "count",
            "TargetResponseTime", "seconds",
            "HealthyHostCount", "count",
            "UnHealthyHostCount", "count"
        );

        for (Map.Entry<String, String> metricEntry : elbMetrics.entrySet()) {
            try {
                GetMetricStatisticsRequest metricRequest = GetMetricStatisticsRequest.builder()
                    .namespace("AWS/ApplicationELB")
                    .metricName(metricEntry.getKey())
                    .dimensions(Dimension.builder()
                        .name("LoadBalancer")
                        .value(loadBalancerName)
                        .build())
                    .startTime(request.getStartTime().toInstant(ZoneOffset.UTC))
                    .endTime(request.getEndTime().toInstant(ZoneOffset.UTC))
                    .period(300)
                    .statistics(Statistic.AVERAGE, Statistic.SUM)
                    .build();

                GetMetricStatisticsResponse response = cloudWatch.getMetricStatistics(metricRequest);

                for (Datapoint datapoint : response.datapoints()) {
                    CloudMetric metric = new CloudMetric();
                    metric.setResourceId(loadBalancerName);
                    metric.setResourceType("elb");
                    metric.setMetricName(metricEntry.getKey().toLowerCase());
                    metric.setValue(datapoint.average() != null ? datapoint.average() : datapoint.sum());
                    metric.setUnit(metricEntry.getValue());
                    metric.setTimestamp(LocalDateTime.ofInstant(datapoint.timestamp(), ZoneOffset.UTC));
                    metric.setProvider("aws");
                    metric.setNamespace("AWS/ApplicationELB");
                    metrics.add(metric);
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching ELB metric {}: {}", metricEntry.getKey(), e.getMessage());
            }
        }

        return metrics;
    }

    private List<CloudMetric> getLambdaMetrics(CloudWatchClient cloudWatch, CloudMetricsRequest request) {
        List<CloudMetric> metrics = new ArrayList<>();
        String functionName = request.getResourceId();

        Map<String, String> lambdaMetrics = Map.of(
            "Invocations", "count",
            "Duration", "milliseconds",
            "Errors", "count",
            "Throttles", "count",
            "ConcurrentExecutions", "count",
            "DeadLetterErrors", "count"
        );

        for (Map.Entry<String, String> metricEntry : lambdaMetrics.entrySet()) {
            try {
                GetMetricStatisticsRequest metricRequest = GetMetricStatisticsRequest.builder()
                    .namespace("AWS/Lambda")
                    .metricName(metricEntry.getKey())
                    .dimensions(Dimension.builder()
                        .name("FunctionName")
                        .value(functionName)
                        .build())
                    .startTime(request.getStartTime().toInstant(ZoneOffset.UTC))
                    .endTime(request.getEndTime().toInstant(ZoneOffset.UTC))
                    .period(300)
                    .statistics(Statistic.AVERAGE, Statistic.SUM)
                    .build();

                GetMetricStatisticsResponse response = cloudWatch.getMetricStatistics(metricRequest);

                for (Datapoint datapoint : response.datapoints()) {
                    CloudMetric metric = new CloudMetric();
                    metric.setResourceId(functionName);
                    metric.setResourceType("lambda");
                    metric.setMetricName(metricEntry.getKey().toLowerCase());
                    metric.setValue(datapoint.average() != null ? datapoint.average() : datapoint.sum());
                    metric.setUnit(metricEntry.getValue());
                    metric.setTimestamp(LocalDateTime.ofInstant(datapoint.timestamp(), ZoneOffset.UTC));
                    metric.setProvider("aws");
                    metric.setNamespace("AWS/Lambda");
                    metrics.add(metric);
                }

            } catch (Exception e) {
                logger.error("❌ Error fetching Lambda metric {}: {}", metricEntry.getKey(), e.getMessage());
            }
        }

        return metrics;
    }

    @Override
    public CloudResourceDiscoveryResponse discoverResources(CloudResourceDiscoveryRequest request) {
        logger.info("🔍 Discovering AWS resources in region: {}", request.getRegion());

        try {
            AwsCloudConfig config = (AwsCloudConfig) request.getCloudConfig();
            Ec2Client ec2Client = createEc2Client(config, request.getRegion());

            List<CloudResource> resources = new ArrayList<>();

            // Discover EC2 instances
            resources.addAll(discoverEc2Instances(ec2Client));

            // Discover RDS instances
            // resources.addAll(discoverRdsInstances(rdsClient));

            // Discover Load Balancers
            // resources.addAll(discoverLoadBalancers(elbClient));

            CloudResourceDiscoveryResponse response = new CloudResourceDiscoveryResponse();
            response.setResources(resources);
            response.setProvider("aws");
            response.setRegion(request.getRegion());
            response.setTimestamp(LocalDateTime.now());
            response.setSuccess(true);

            logger.info("✅ Discovered {} AWS resources", resources.size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error discovering AWS resources: {}", e.getMessage(), e);
            return CloudResourceDiscoveryResponse.failure("Error discovering AWS resources: " + e.getMessage());
        }
    }

    private List<CloudResource> discoverEc2Instances(Ec2Client ec2Client) {
        List<CloudResource> resources = new ArrayList<>();

        try {
            DescribeInstancesResponse response = ec2Client.describeInstances();

            for (Reservation reservation : response.reservations()) {
                for (Instance instance : reservation.instances()) {
                    CloudResource resource = new CloudResource();
                    resource.setResourceId(instance.instanceId());
                    resource.setResourceType("ec2");
                    resource.setResourceName(getInstanceName(instance));
                    resource.setProvider("aws");
                    resource.setRegion(instance.placement().availabilityZone());
                    resource.setState(instance.state().name().toString());
                    resource.setInstanceType(instance.instanceType().toString());
                    resource.setLaunchTime(LocalDateTime.ofInstant(instance.launchTime(), ZoneOffset.UTC));
                    
                    // Add tags
                    Map<String, String> tags = new HashMap<>();
                    for (Tag tag : instance.tags()) {
                        tags.put(tag.key(), tag.value());
                    }
                    resource.setTags(tags);
                    
                    resources.add(resource);
                }
            }

        } catch (Exception e) {
            logger.error("❌ Error discovering EC2 instances: {}", e.getMessage(), e);
        }

        return resources;
    }

    private String getInstanceName(Instance instance) {
        return instance.tags().stream()
                .filter(tag -> "Name".equals(tag.key()))
                .map(Tag::value)
                .findFirst()
                .orElse(instance.instanceId());
    }

    private CloudWatchClient createCloudWatchClient(AwsCloudConfig config) {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(
            config.getAccessKeyId(), config.getSecretAccessKey());

        return CloudWatchClient.builder()
                .region(Region.of(config.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    private Ec2Client createEc2Client(AwsCloudConfig config, String region) {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(
            config.getAccessKeyId(), config.getSecretAccessKey());

        return Ec2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    @Override
    public boolean testConnection(CloudConfig config) {
        try {
            AwsCloudConfig awsConfig = (AwsCloudConfig) config;
            CloudWatchClient cloudWatch = createCloudWatchClient(awsConfig);
            
            // Test connection by listing metrics
            ListMetricsRequest request = ListMetricsRequest.builder()
                    .maxRecords(1)
                    .build();
            
            cloudWatch.listMetrics(request);
            return true;
            
        } catch (Exception e) {
            logger.error("❌ AWS connection test failed: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "aws";
    }
}
