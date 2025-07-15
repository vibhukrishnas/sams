package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

// Config represents the agent configuration
type Config struct {
	ServerURL          string `json:"server_url"`
	APIKey            string `json:"api_key"`
	AgentID           string `json:"agent_id"`
	CollectionInterval int    `json:"collection_interval"`
	LogLevel          string `json:"log_level"`
}

// DockerMetrics represents Docker container metrics
type DockerMetrics struct {
	AgentID   string                 `json:"agentId"`
	Timestamp string                 `json:"timestamp"`
	Hostname  string                 `json:"hostname"`
	Metrics   map[string]interface{} `json:"metrics"`
}

// ContainerInfo represents container information
type ContainerInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Status  string            `json:"status"`
	State   string            `json:"state"`
	Created int64             `json:"created"`
	Ports   []types.Port      `json:"ports"`
	Labels  map[string]string `json:"labels"`
}

// ContainerStats represents container statistics
type ContainerStats struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	CPUPercent   float64 `json:"cpu_percent"`
	MemoryUsage  uint64  `json:"memory_usage"`
	MemoryLimit  uint64  `json:"memory_limit"`
	MemoryPercent float64 `json:"memory_percent"`
	NetworkRx    uint64  `json:"network_rx"`
	NetworkTx    uint64  `json:"network_tx"`
	BlockRead    uint64  `json:"block_read"`
	BlockWrite   uint64  `json:"block_write"`
}

// DockerAgent represents the Docker monitoring agent
type DockerAgent struct {
	config       Config
	dockerClient *client.Client
	httpClient   *http.Client
	running      bool
}

// NewDockerAgent creates a new Docker agent
func NewDockerAgent(configPath string) (*DockerAgent, error) {
	config, err := loadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %v", err)
	}

	dockerClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %v", err)
	}

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	return &DockerAgent{
		config:       config,
		dockerClient: dockerClient,
		httpClient:   httpClient,
		running:      false,
	}, nil
}

// loadConfig loads configuration from JSON file
func loadConfig(configPath string) (Config, error) {
	var config Config
	
	// Default configuration
	config = Config{
		ServerURL:          "http://localhost:8080",
		CollectionInterval: 30,
		LogLevel:          "INFO",
	}

	if configPath != "" {
		file, err := os.Open(configPath)
		if err != nil {
			log.Printf("Warning: Could not open config file %s: %v", configPath, err)
			return config, nil
		}
		defer file.Close()

		decoder := json.NewDecoder(file)
		if err := decoder.Decode(&config); err != nil {
			return config, fmt.Errorf("failed to decode config: %v", err)
		}
	}

	// Set default agent ID if not provided
	if config.AgentID == "" {
		hostname, _ := os.Hostname()
		config.AgentID = fmt.Sprintf("docker-agent-%s", hostname)
	}

	return config, nil
}

// Start starts the Docker agent
func (da *DockerAgent) Start() error {
	log.Printf("Starting SAMS Docker Agent: %s", da.config.AgentID)
	da.running = true

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Register agent
	if err := da.registerAgent(); err != nil {
		log.Printf("Failed to register agent: %v", err)
	}

	// Start metrics collection
	ticker := time.NewTicker(time.Duration(da.config.CollectionInterval) * time.Second)
	defer ticker.Stop()

	for da.running {
		select {
		case <-ticker.C:
			if err := da.collectAndSendMetrics(); err != nil {
				log.Printf("Error collecting metrics: %v", err)
			}
		case <-sigChan:
			log.Println("Received shutdown signal")
			da.running = false
		}
	}

	log.Println("SAMS Docker Agent stopped")
	return nil
}

// registerAgent registers the agent with the SAMS server
func (da *DockerAgent) registerAgent() error {
	hostname, _ := os.Hostname()
	
	registrationData := map[string]interface{}{
		"agentId":      da.config.AgentID,
		"agentType":    "docker",
		"hostname":     hostname,
		"capabilities": []string{"containers", "images", "volumes", "networks"},
		"registeredAt": time.Now().UTC().Format(time.RFC3339),
	}

	return da.sendToServer("/api/v1/agents/register", registrationData)
}

// collectAndSendMetrics collects Docker metrics and sends them to the server
func (da *DockerAgent) collectAndSendMetrics() error {
	ctx := context.Background()
	hostname, _ := os.Hostname()

	metrics := DockerMetrics{
		AgentID:   da.config.AgentID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Hostname:  hostname,
		Metrics:   make(map[string]interface{}),
	}

	// Collect container information
	containers, err := da.collectContainerInfo(ctx)
	if err != nil {
		return fmt.Errorf("failed to collect container info: %v", err)
	}
	metrics.Metrics["containers"] = containers

	// Collect container statistics
	stats, err := da.collectContainerStats(ctx)
	if err != nil {
		return fmt.Errorf("failed to collect container stats: %v", err)
	}
	metrics.Metrics["container_stats"] = stats

	// Collect Docker system info
	systemInfo, err := da.collectSystemInfo(ctx)
	if err != nil {
		return fmt.Errorf("failed to collect system info: %v", err)
	}
	metrics.Metrics["system"] = systemInfo

	// Perform health checks and generate alerts
	alerts, err := da.performHealthChecks(ctx, stats)
	if err != nil {
		log.Printf("Failed to perform health checks: %v", err)
	} else if len(alerts) > 0 {
		metrics.Metrics["alerts"] = alerts
		// Send alerts immediately
		for _, alert := range alerts {
			if err := da.sendToServer("/api/v1/alerts", alert); err != nil {
				log.Printf("Failed to send alert: %v", err)
			}
		}
	}

	// Send metrics to server
	return da.sendToServer("/api/v1/metrics", metrics)
}

// collectContainerInfo collects information about all containers
func (da *DockerAgent) collectContainerInfo(ctx context.Context) ([]ContainerInfo, error) {
	containers, err := da.dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var containerInfos []ContainerInfo
	for _, container := range containers {
		info := ContainerInfo{
			ID:      container.ID[:12], // Short ID
			Name:    container.Names[0][1:], // Remove leading slash
			Image:   container.Image,
			Status:  container.Status,
			State:   container.State,
			Created: container.Created,
			Ports:   container.Ports,
			Labels:  container.Labels,
		}
		containerInfos = append(containerInfos, info)
	}

	return containerInfos, nil
}

// collectContainerStats collects statistics for running containers
func (da *DockerAgent) collectContainerStats(ctx context.Context) ([]ContainerStats, error) {
	containers, err := da.dockerClient.ContainerList(ctx, types.ContainerListOptions{})
	if err != nil {
		return nil, err
	}

	var containerStats []ContainerStats
	for _, container := range containers {
		stats, err := da.dockerClient.ContainerStats(ctx, container.ID, false)
		if err != nil {
			log.Printf("Failed to get stats for container %s: %v", container.ID, err)
			continue
		}

		var statsData types.StatsJSON
		if err := json.NewDecoder(stats.Body).Decode(&statsData); err != nil {
			stats.Body.Close()
			continue
		}
		stats.Body.Close()

		// Calculate CPU percentage
		cpuPercent := calculateCPUPercent(&statsData)

		// Calculate memory percentage
		memoryPercent := float64(statsData.MemoryStats.Usage) / float64(statsData.MemoryStats.Limit) * 100

		// Calculate network I/O
		var networkRx, networkTx uint64
		for _, network := range statsData.Networks {
			networkRx += network.RxBytes
			networkTx += network.TxBytes
		}

		// Calculate block I/O
		var blockRead, blockWrite uint64
		for _, blkio := range statsData.BlkioStats.IoServiceBytesRecursive {
			if blkio.Op == "Read" {
				blockRead += blkio.Value
			} else if blkio.Op == "Write" {
				blockWrite += blkio.Value
			}
		}

		containerStat := ContainerStats{
			ID:            container.ID[:12],
			Name:          container.Names[0][1:],
			CPUPercent:    cpuPercent,
			MemoryUsage:   statsData.MemoryStats.Usage,
			MemoryLimit:   statsData.MemoryStats.Limit,
			MemoryPercent: memoryPercent,
			NetworkRx:     networkRx,
			NetworkTx:     networkTx,
			BlockRead:     blockRead,
			BlockWrite:    blockWrite,
		}

		containerStats = append(containerStats, containerStat)
	}

	return containerStats, nil
}

// calculateCPUPercent calculates CPU usage percentage
func calculateCPUPercent(stats *types.StatsJSON) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
	
	if systemDelta > 0 && cpuDelta > 0 {
		return (cpuDelta / systemDelta) * float64(len(stats.CPUStats.CPUUsage.PercpuUsage)) * 100
	}
	return 0
}

// collectSystemInfo collects Docker system information
func (da *DockerAgent) collectSystemInfo(ctx context.Context) (map[string]interface{}, error) {
	info, err := da.dockerClient.Info(ctx)
	if err != nil {
		return nil, err
	}

	// Collect additional Docker daemon info
	version, err := da.dockerClient.ServerVersion(ctx)
	if err != nil {
		log.Printf("Failed to get Docker version: %v", err)
	}

	// Collect image information
	images, err := da.collectImageInfo(ctx)
	if err != nil {
		log.Printf("Failed to collect image info: %v", err)
	}

	// Collect volume information
	volumes, err := da.collectVolumeInfo(ctx)
	if err != nil {
		log.Printf("Failed to collect volume info: %v", err)
	}

	// Collect network information
	networks, err := da.collectNetworkInfo(ctx)
	if err != nil {
		log.Printf("Failed to collect network info: %v", err)
	}

	systemInfo := map[string]interface{}{
		"containers_running": info.ContainersRunning,
		"containers_paused":  info.ContainersPaused,
		"containers_stopped": info.ContainersStopped,
		"containers_total":   info.Containers,
		"images":            info.Images,
		"server_version":    info.ServerVersion,
		"kernel_version":    info.KernelVersion,
		"operating_system":  info.OperatingSystem,
		"architecture":      info.Architecture,
		"ncpu":             info.NCPU,
		"mem_total":        info.MemTotal,
		"docker_root_dir":  info.DockerRootDir,
		"storage_driver":   info.Driver,
		"logging_driver":   info.LoggingDriver,
		"cgroup_driver":    info.CgroupDriver,
		"swarm_mode":       info.Swarm.LocalNodeState != "inactive",
		"version_info":     version,
		"image_details":    images,
		"volume_details":   volumes,
		"network_details":  networks,
	}

	return systemInfo, nil
}

// collectImageInfo collects Docker image information
func (da *DockerAgent) collectImageInfo(ctx context.Context) ([]map[string]interface{}, error) {
	images, err := da.dockerClient.ImageList(ctx, types.ImageListOptions{})
	if err != nil {
		return nil, err
	}

	var imageInfos []map[string]interface{}
	for _, image := range images {
		var repoTags []string
		if len(image.RepoTags) > 0 {
			repoTags = image.RepoTags
		} else {
			repoTags = []string{"<none>:<none>"}
		}

		imageInfo := map[string]interface{}{
			"id":         image.ID[:12],
			"repo_tags":  repoTags,
			"created":    image.Created,
			"size":       image.Size,
			"virtual_size": image.VirtualSize,
			"shared_size": image.SharedSize,
			"containers": image.Containers,
		}
		imageInfos = append(imageInfos, imageInfo)
	}

	return imageInfos, nil
}

// collectVolumeInfo collects Docker volume information
func (da *DockerAgent) collectVolumeInfo(ctx context.Context) ([]map[string]interface{}, error) {
	volumes, err := da.dockerClient.VolumeList(ctx, types.VolumeListOptions{})
	if err != nil {
		return nil, err
	}

	var volumeInfos []map[string]interface{}
	for _, volume := range volumes.Volumes {
		volumeInfo := map[string]interface{}{
			"name":       volume.Name,
			"driver":     volume.Driver,
			"mountpoint": volume.Mountpoint,
			"created_at": volume.CreatedAt,
			"labels":     volume.Labels,
			"options":    volume.Options,
			"scope":      volume.Scope,
		}
		volumeInfos = append(volumeInfos, volumeInfo)
	}

	return volumeInfos, nil
}

// collectNetworkInfo collects Docker network information
func (da *DockerAgent) collectNetworkInfo(ctx context.Context) ([]map[string]interface{}, error) {
	networks, err := da.dockerClient.NetworkList(ctx, types.NetworkListOptions{})
	if err != nil {
		return nil, err
	}

	var networkInfos []map[string]interface{}
	for _, network := range networks {
		networkInfo := map[string]interface{}{
			"id":         network.ID[:12],
			"name":       network.Name,
			"driver":     network.Driver,
			"scope":      network.Scope,
			"created":    network.Created,
			"labels":     network.Labels,
			"options":    network.Options,
			"containers": len(network.Containers),
		}
		networkInfos = append(networkInfos, networkInfo)
	}

	return networkInfos, nil
}

// performHealthChecks performs health checks and generates alerts
func (da *DockerAgent) performHealthChecks(ctx context.Context, containerStats []ContainerStats) ([]map[string]interface{}, error) {
	var alerts []map[string]interface{}

	// Check container resource usage
	for _, stats := range containerStats {
		// High CPU usage alert
		if stats.CPUPercent > 80 {
			alert := da.createAlert("high_cpu_usage", "critical",
				fmt.Sprintf("Container %s has high CPU usage: %.2f%%", stats.Name, stats.CPUPercent),
				map[string]interface{}{
					"container_id": stats.ID,
					"container_name": stats.Name,
					"cpu_percent": stats.CPUPercent,
					"threshold": 80,
				})
			alerts = append(alerts, alert)
		}

		// High memory usage alert
		if stats.MemoryPercent > 85 {
			alert := da.createAlert("high_memory_usage", "high",
				fmt.Sprintf("Container %s has high memory usage: %.2f%%", stats.Name, stats.MemoryPercent),
				map[string]interface{}{
					"container_id": stats.ID,
					"container_name": stats.Name,
					"memory_percent": stats.MemoryPercent,
					"memory_usage": stats.MemoryUsage,
					"memory_limit": stats.MemoryLimit,
					"threshold": 85,
				})
			alerts = append(alerts, alert)
		}
	}

	// Check for stopped containers that should be running
	stoppedContainers, err := da.checkStoppedContainers(ctx)
	if err != nil {
		log.Printf("Failed to check stopped containers: %v", err)
	} else {
		for _, container := range stoppedContainers {
			alert := da.createAlert("container_stopped", "high",
				fmt.Sprintf("Container %s is stopped but should be running", container["name"]),
				container)
			alerts = append(alerts, alert)
		}
	}

	// Check Docker daemon health
	if err := da.checkDockerDaemonHealth(ctx); err != nil {
		alert := da.createAlert("docker_daemon_unhealthy", "critical",
			fmt.Sprintf("Docker daemon health check failed: %v", err),
			map[string]interface{}{
				"error": err.Error(),
			})
		alerts = append(alerts, alert)
	}

	// Check disk space for Docker root directory
	diskUsage, err := da.checkDockerDiskUsage(ctx)
	if err != nil {
		log.Printf("Failed to check disk usage: %v", err)
	} else if diskUsage > 90 {
		alert := da.createAlert("docker_disk_space_low", "high",
			fmt.Sprintf("Docker disk usage is high: %.2f%%", diskUsage),
			map[string]interface{}{
				"disk_usage_percent": diskUsage,
				"threshold": 90,
			})
		alerts = append(alerts, alert)
	}

	return alerts, nil
}

// createAlert creates a standardized alert structure
func (da *DockerAgent) createAlert(alertType, severity, message string, metadata map[string]interface{}) map[string]interface{} {
	hostname, _ := os.Hostname()

	return map[string]interface{}{
		"title":       message,
		"description": fmt.Sprintf("Docker Agent Alert: %s", message),
		"severity":    severity,
		"source":      fmt.Sprintf("docker-agent-%s", hostname),
		"source_type": "docker",
		"alert_type":  alertType,
		"agent_id":    da.config.AgentID,
		"hostname":    hostname,
		"metadata":    metadata,
		"tags":        []string{"docker", "infrastructure", alertType},
		"created_at":  time.Now().UTC().Format(time.RFC3339),
	}
}

// checkStoppedContainers checks for containers that should be running but are stopped
func (da *DockerAgent) checkStoppedContainers(ctx context.Context) ([]map[string]interface{}, error) {
	containers, err := da.dockerClient.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var stoppedContainers []map[string]interface{}
	for _, container := range containers {
		// Check if container has restart policy and is stopped
		if container.State == "exited" || container.State == "dead" {
			inspect, err := da.dockerClient.ContainerInspect(ctx, container.ID)
			if err != nil {
				continue
			}

			// If container has restart policy "always" or "unless-stopped", it should be running
			restartPolicy := inspect.HostConfig.RestartPolicy.Name
			if restartPolicy == "always" || restartPolicy == "unless-stopped" {
				containerInfo := map[string]interface{}{
					"id":             container.ID[:12],
					"name":           container.Names[0][1:],
					"image":          container.Image,
					"state":          container.State,
					"status":         container.Status,
					"restart_policy": restartPolicy,
					"exit_code":      inspect.State.ExitCode,
				}
				stoppedContainers = append(stoppedContainers, containerInfo)
			}
		}
	}

	return stoppedContainers, nil
}

// checkDockerDaemonHealth checks if Docker daemon is healthy
func (da *DockerAgent) checkDockerDaemonHealth(ctx context.Context) error {
	// Try to ping Docker daemon
	ping, err := da.dockerClient.Ping(ctx)
	if err != nil {
		return fmt.Errorf("Docker daemon ping failed: %v", err)
	}

	// Check API version compatibility
	if ping.APIVersion == "" {
		return fmt.Errorf("Docker daemon API version not available")
	}

	// Try to get system info
	_, err = da.dockerClient.Info(ctx)
	if err != nil {
		return fmt.Errorf("Docker daemon info request failed: %v", err)
	}

	return nil
}

// checkDockerDiskUsage checks disk usage for Docker root directory
func (da *DockerAgent) checkDockerDiskUsage(ctx context.Context) (float64, error) {
	info, err := da.dockerClient.Info(ctx)
	if err != nil {
		return 0, err
	}

	// Get disk usage using system df
	diskUsage, err := da.dockerClient.DiskUsage(ctx, types.DiskUsageOptions{})
	if err != nil {
		return 0, err
	}

	// Calculate total usage
	var totalUsage int64
	totalUsage += diskUsage.LayersSize
	for _, volume := range diskUsage.Volumes {
		if volume.UsageData != nil {
			totalUsage += volume.UsageData.Size
		}
	}

	// Estimate available space (this is a simplified calculation)
	// In a real implementation, you'd want to check the actual filesystem
	estimatedTotal := info.MemTotal // This is not accurate, just for demonstration
	if estimatedTotal == 0 {
		estimatedTotal = 100 * 1024 * 1024 * 1024 // 100GB default
	}

	usagePercent := float64(totalUsage) / float64(estimatedTotal) * 100
	return usagePercent, nil
}

// handleRemoteCommands handles remote commands from the SAMS server
func (da *DockerAgent) handleRemoteCommands() {
	// This would typically be implemented with WebSocket or polling
	// For now, we'll implement a simple HTTP endpoint check
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for da.running {
		select {
		case <-ticker.C:
			if err := da.checkForCommands(); err != nil {
				log.Printf("Error checking for commands: %v", err)
			}
		}
	}
}

// checkForCommands checks for pending commands from the server
func (da *DockerAgent) checkForCommands() error {
	url := da.config.ServerURL + "/api/v1/agents/" + da.config.AgentID + "/commands"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	if da.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+da.config.APIKey)
	}

	resp, err := da.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil // No commands or server error
	}

	var commands []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&commands); err != nil {
		return err
	}

	for _, command := range commands {
		if err := da.executeCommand(command); err != nil {
			log.Printf("Failed to execute command %v: %v", command, err)
		}
	}

	return nil
}

// executeCommand executes a remote command
func (da *DockerAgent) executeCommand(command map[string]interface{}) error {
	ctx := context.Background()
	commandType, ok := command["type"].(string)
	if !ok {
		return fmt.Errorf("invalid command type")
	}

	commandID, _ := command["id"].(string)
	log.Printf("Executing command: %s (ID: %s)", commandType, commandID)

	var result map[string]interface{}
	var err error

	switch commandType {
	case "container_start":
		result, err = da.startContainer(ctx, command)
	case "container_stop":
		result, err = da.stopContainer(ctx, command)
	case "container_restart":
		result, err = da.restartContainer(ctx, command)
	case "container_remove":
		result, err = da.removeContainer(ctx, command)
	case "image_pull":
		result, err = da.pullImage(ctx, command)
	case "image_remove":
		result, err = da.removeImage(ctx, command)
	case "container_logs":
		result, err = da.getContainerLogs(ctx, command)
	case "system_prune":
		result, err = da.systemPrune(ctx, command)
	default:
		err = fmt.Errorf("unknown command type: %s", commandType)
	}

	// Send command result back to server
	response := map[string]interface{}{
		"command_id": commandID,
		"agent_id":   da.config.AgentID,
		"status":     "completed",
		"result":     result,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
	}

	if err != nil {
		response["status"] = "failed"
		response["error"] = err.Error()
	}

	return da.sendToServer("/api/v1/agents/command-results", response)
}

// startContainer starts a Docker container
func (da *DockerAgent) startContainer(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	containerID, ok := command["container_id"].(string)
	if !ok {
		return nil, fmt.Errorf("container_id is required")
	}

	if err := da.dockerClient.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"container_id": containerID,
		"action":       "started",
	}, nil
}

// stopContainer stops a Docker container
func (da *DockerAgent) stopContainer(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	containerID, ok := command["container_id"].(string)
	if !ok {
		return nil, fmt.Errorf("container_id is required")
	}

	timeout := 30 // Default timeout
	if t, ok := command["timeout"].(float64); ok {
		timeout = int(t)
	}

	timeoutDuration := time.Duration(timeout) * time.Second
	if err := da.dockerClient.ContainerStop(ctx, containerID, &timeoutDuration); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"container_id": containerID,
		"action":       "stopped",
	}, nil
}

// restartContainer restarts a Docker container
func (da *DockerAgent) restartContainer(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	containerID, ok := command["container_id"].(string)
	if !ok {
		return nil, fmt.Errorf("container_id is required")
	}

	timeout := 30 // Default timeout
	if t, ok := command["timeout"].(float64); ok {
		timeout = int(t)
	}

	timeoutDuration := time.Duration(timeout) * time.Second
	if err := da.dockerClient.ContainerRestart(ctx, containerID, &timeoutDuration); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"container_id": containerID,
		"action":       "restarted",
	}, nil
}

// removeContainer removes a Docker container
func (da *DockerAgent) removeContainer(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	containerID, ok := command["container_id"].(string)
	if !ok {
		return nil, fmt.Errorf("container_id is required")
	}

	force, _ := command["force"].(bool)
	removeVolumes, _ := command["remove_volumes"].(bool)

	options := types.ContainerRemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
	}

	if err := da.dockerClient.ContainerRemove(ctx, containerID, options); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"container_id": containerID,
		"action":       "removed",
	}, nil
}

// pullImage pulls a Docker image
func (da *DockerAgent) pullImage(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	imageName, ok := command["image"].(string)
	if !ok {
		return nil, fmt.Errorf("image name is required")
	}

	reader, err := da.dockerClient.ImagePull(ctx, imageName, types.ImagePullOptions{})
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	// Read the pull output (optional, for logging)
	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"image":  imageName,
		"action": "pulled",
	}, nil
}

// removeImage removes a Docker image
func (da *DockerAgent) removeImage(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	imageID, ok := command["image_id"].(string)
	if !ok {
		return nil, fmt.Errorf("image_id is required")
	}

	force, _ := command["force"].(bool)
	pruneChildren, _ := command["prune_children"].(bool)

	options := types.ImageRemoveOptions{
		Force:         force,
		PruneChildren: pruneChildren,
	}

	removedImages, err := da.dockerClient.ImageRemove(ctx, imageID, options)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"image_id":       imageID,
		"action":         "removed",
		"removed_images": removedImages,
	}, nil
}

// getContainerLogs retrieves container logs
func (da *DockerAgent) getContainerLogs(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	containerID, ok := command["container_id"].(string)
	if !ok {
		return nil, fmt.Errorf("container_id is required")
	}

	tail := "100" // Default tail
	if t, ok := command["tail"].(string); ok {
		tail = t
	}

	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
		Timestamps: true,
	}

	reader, err := da.dockerClient.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	logs, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"container_id": containerID,
		"logs":         string(logs),
		"action":       "logs_retrieved",
	}, nil
}

// systemPrune performs Docker system cleanup
func (da *DockerAgent) systemPrune(ctx context.Context, command map[string]interface{}) (map[string]interface{}, error) {
	pruneContainers, _ := command["prune_containers"].(bool)
	pruneImages, _ := command["prune_images"].(bool)
	pruneVolumes, _ := command["prune_volumes"].(bool)
	pruneNetworks, _ := command["prune_networks"].(bool)

	result := map[string]interface{}{
		"action": "system_pruned",
	}

	if pruneContainers {
		containerReport, err := da.dockerClient.ContainersPrune(ctx, filters.Args{})
		if err != nil {
			return nil, fmt.Errorf("failed to prune containers: %v", err)
		}
		result["containers_deleted"] = containerReport.ContainersDeleted
		result["containers_space_reclaimed"] = containerReport.SpaceReclaimed
	}

	if pruneImages {
		imageReport, err := da.dockerClient.ImagesPrune(ctx, filters.Args{})
		if err != nil {
			return nil, fmt.Errorf("failed to prune images: %v", err)
		}
		result["images_deleted"] = imageReport.ImagesDeleted
		result["images_space_reclaimed"] = imageReport.SpaceReclaimed
	}

	if pruneVolumes {
		volumeReport, err := da.dockerClient.VolumesPrune(ctx, filters.Args{})
		if err != nil {
			return nil, fmt.Errorf("failed to prune volumes: %v", err)
		}
		result["volumes_deleted"] = volumeReport.VolumesDeleted
		result["volumes_space_reclaimed"] = volumeReport.SpaceReclaimed
	}

	if pruneNetworks {
		networkReport, err := da.dockerClient.NetworksPrune(ctx, filters.Args{})
		if err != nil {
			return nil, fmt.Errorf("failed to prune networks: %v", err)
		}
		result["networks_deleted"] = networkReport.NetworksDeleted
	}

	return result, nil
}

// deployContainer deploys a new container with specified configuration
func (da *DockerAgent) deployContainer(ctx context.Context, config map[string]interface{}) error {
	imageName, ok := config["image"].(string)
	if !ok {
		return fmt.Errorf("image name is required")
	}

	containerName, _ := config["name"].(string)
	if containerName == "" {
		containerName = fmt.Sprintf("sams-deployed-%d", time.Now().Unix())
	}

	// Pull image if not exists
	_, _, err := da.dockerClient.ImageInspectWithRaw(ctx, imageName)
	if err != nil {
		log.Printf("Image %s not found locally, pulling...", imageName)
		reader, err := da.dockerClient.ImagePull(ctx, imageName, types.ImagePullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull image: %v", err)
		}
		defer reader.Close()
		io.Copy(io.Discard, reader)
	}

	// Parse environment variables
	var env []string
	if envVars, ok := config["environment"].(map[string]interface{}); ok {
		for key, value := range envVars {
			env = append(env, fmt.Sprintf("%s=%v", key, value))
		}
	}

	// Parse port bindings
	portBindings := make(nat.PortMap)
	exposedPorts := make(nat.PortSet)
	if ports, ok := config["ports"].(map[string]interface{}); ok {
		for containerPort, hostPort := range ports {
			port, err := nat.NewPort("tcp", containerPort)
			if err != nil {
				continue
			}
			exposedPorts[port] = struct{}{}
			portBindings[port] = []nat.PortBinding{
				{
					HostIP:   "0.0.0.0",
					HostPort: fmt.Sprintf("%v", hostPort),
				},
			}
		}
	}

	// Create container
	containerConfig := &container.Config{
		Image:        imageName,
		Env:          env,
		ExposedPorts: exposedPorts,
	}

	hostConfig := &container.HostConfig{
		PortBindings: portBindings,
		RestartPolicy: container.RestartPolicy{
			Name: "unless-stopped",
		},
	}

	resp, err := da.dockerClient.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, containerName)
	if err != nil {
		return fmt.Errorf("failed to create container: %v", err)
	}

	// Start container
	if err := da.dockerClient.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %v", err)
	}

	log.Printf("Successfully deployed container %s (ID: %s)", containerName, resp.ID[:12])
	return nil
}

// sendToServer sends data to the SAMS server
func (da *DockerAgent) sendToServer(endpoint string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %v", err)
	}

	url := da.config.ServerURL + endpoint
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if da.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+da.config.APIKey)
	}

	resp, err := da.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	log.Printf("Successfully sent data to %s", endpoint)
	return nil
}

func main() {
	configPath := "agent_config.json"
	if len(os.Args) > 1 {
		configPath = os.Args[1]
	}

	agent, err := NewDockerAgent(configPath)
	if err != nil {
		log.Fatalf("Failed to create Docker agent: %v", err)
	}

	// Start metrics collection
	go agent.start()

	// Start remote command handler
	go agent.handleRemoteCommands()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down Docker Agent...")
	agent.stop()
}
