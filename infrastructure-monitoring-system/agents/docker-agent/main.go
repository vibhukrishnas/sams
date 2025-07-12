package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
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
	}

	return systemInfo, nil
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

	if err := agent.Start(); err != nil {
		log.Fatalf("Agent error: %v", err)
	}
}
