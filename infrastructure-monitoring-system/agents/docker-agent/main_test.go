package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/opencontainers/image-spec/specs-go/v1"
)

// MockDockerClient implements a mock Docker client for testing
type MockDockerClient struct {
	containers []types.Container
	images     []types.ImageSummary
	info       types.Info
	version    types.Version
}

func (m *MockDockerClient) ContainerList(ctx context.Context, options types.ContainerListOptions) ([]types.Container, error) {
	return m.containers, nil
}

func (m *MockDockerClient) ContainerStats(ctx context.Context, containerID string, stream bool) (types.ContainerStats, error) {
	// Return mock stats
	return types.ContainerStats{}, nil
}

func (m *MockDockerClient) Info(ctx context.Context) (types.Info, error) {
	return m.info, nil
}

func (m *MockDockerClient) ServerVersion(ctx context.Context) (types.Version, error) {
	return m.version, nil
}

func (m *MockDockerClient) ImageList(ctx context.Context, options types.ImageListOptions) ([]types.ImageSummary, error) {
	return m.images, nil
}

func (m *MockDockerClient) VolumeList(ctx context.Context, options types.VolumeListOptions) (types.VolumeListResponse, error) {
	return types.VolumeListResponse{}, nil
}

func (m *MockDockerClient) NetworkList(ctx context.Context, options types.NetworkListOptions) ([]types.NetworkResource, error) {
	return []types.NetworkResource{}, nil
}

func (m *MockDockerClient) Ping(ctx context.Context) (types.Ping, error) {
	return types.Ping{APIVersion: "1.41"}, nil
}

func (m *MockDockerClient) DiskUsage(ctx context.Context, options types.DiskUsageOptions) (types.DiskUsage, error) {
	return types.DiskUsage{}, nil
}

func (m *MockDockerClient) ContainerInspect(ctx context.Context, containerID string) (types.ContainerJSON, error) {
	return types.ContainerJSON{}, nil
}

func (m *MockDockerClient) ContainerStart(ctx context.Context, containerID string, options types.ContainerStartOptions) error {
	return nil
}

func (m *MockDockerClient) ContainerStop(ctx context.Context, containerID string, timeout *time.Duration) error {
	return nil
}

func (m *MockDockerClient) ContainerRestart(ctx context.Context, containerID string, timeout *time.Duration) error {
	return nil
}

func (m *MockDockerClient) ContainerRemove(ctx context.Context, containerID string, options types.ContainerRemoveOptions) error {
	return nil
}

func (m *MockDockerClient) ImagePull(ctx context.Context, refStr string, options types.ImagePullOptions) (io.ReadCloser, error) {
	return io.NopCloser(strings.NewReader("pull complete")), nil
}

func (m *MockDockerClient) ImageRemove(ctx context.Context, imageID string, options types.ImageRemoveOptions) ([]types.ImageDeleteResponseItem, error) {
	return []types.ImageDeleteResponseItem{}, nil
}

func (m *MockDockerClient) ContainerLogs(ctx context.Context, container string, options types.ContainerLogsOptions) (io.ReadCloser, error) {
	return io.NopCloser(strings.NewReader("test logs")), nil
}

func (m *MockDockerClient) ContainersPrune(ctx context.Context, pruneFilters filters.Args) (types.ContainersPruneReport, error) {
	return types.ContainersPruneReport{}, nil
}

func (m *MockDockerClient) ImagesPrune(ctx context.Context, pruneFilters filters.Args) (types.ImagesPruneReport, error) {
	return types.ImagesPruneReport{}, nil
}

func (m *MockDockerClient) VolumesPrune(ctx context.Context, pruneFilters filters.Args) (types.VolumesPruneReport, error) {
	return types.VolumesPruneReport{}, nil
}

func (m *MockDockerClient) NetworksPrune(ctx context.Context, pruneFilters filters.Args) (types.NetworksPruneReport, error) {
	return types.NetworksPruneReport{}, nil
}

func (m *MockDockerClient) ContainerCreate(ctx context.Context, config *container.Config, hostConfig *container.HostConfig, networkingConfig *network.NetworkingConfig, platform *specs.Platform, containerName string) (container.ContainerCreateCreatedBody, error) {
	return container.ContainerCreateCreatedBody{ID: "test-container-id"}, nil
}

func (m *MockDockerClient) ImageInspectWithRaw(ctx context.Context, imageID string) (types.ImageInspect, []byte, error) {
	return types.ImageInspect{}, []byte{}, nil
}

// Test configuration loading
func TestLoadConfig(t *testing.T) {
	// Create temporary config file
	configData := Config{
		AgentID:         "test-agent",
		ServerURL:       "http://localhost:8080",
		APIKey:          "test-key",
		MetricsInterval: 30,
		DockerSocket:    "/var/run/docker.sock",
		LogLevel:        "info",
	}

	configJSON, err := json.Marshal(configData)
	if err != nil {
		t.Fatalf("Failed to marshal config: %v", err)
	}

	tmpFile, err := os.CreateTemp("", "test_config_*.json")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(configJSON); err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}
	tmpFile.Close()

	// Test loading config
	config, err := loadConfig(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	if config.AgentID != "test-agent" {
		t.Errorf("Expected AgentID 'test-agent', got '%s'", config.AgentID)
	}

	if config.ServerURL != "http://localhost:8080" {
		t.Errorf("Expected ServerURL 'http://localhost:8080', got '%s'", config.ServerURL)
	}
}

// Test Docker agent creation
func TestNewDockerAgent(t *testing.T) {
	// Create temporary config file
	configData := Config{
		AgentID:         "test-agent",
		ServerURL:       "http://localhost:8080",
		APIKey:          "test-key",
		MetricsInterval: 30,
		DockerSocket:    "/var/run/docker.sock",
		LogLevel:        "info",
	}

	configJSON, err := json.Marshal(configData)
	if err != nil {
		t.Fatalf("Failed to marshal config: %v", err)
	}

	tmpFile, err := os.CreateTemp("", "test_config_*.json")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(configJSON); err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}
	tmpFile.Close()

	// Test creating Docker agent
	agent, err := NewDockerAgent(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to create Docker agent: %v", err)
	}

	if agent.config.AgentID != "test-agent" {
		t.Errorf("Expected AgentID 'test-agent', got '%s'", agent.config.AgentID)
	}
}

// Test metrics collection
func TestCollectMetrics(t *testing.T) {
	// Create mock Docker client
	mockClient := &MockDockerClient{
		containers: []types.Container{
			{
				ID:    "container1",
				Names: []string{"/test-container"},
				Image: "test-image",
				State: "running",
			},
		},
		info: types.Info{
			ContainersRunning: 1,
			ContainersStopped: 0,
			Images:           5,
			ServerVersion:    "20.10.0",
		},
		version: types.Version{
			Version:   "20.10.0",
			APIVersion: "1.41",
		},
	}

	// Create agent with mock client
	agent := &DockerAgent{
		config: &Config{
			AgentID:   "test-agent",
			ServerURL: "http://localhost:8080",
		},
		dockerClient: mockClient,
		httpClient:   &http.Client{},
		running:      true,
	}

	// Test metrics collection
	ctx := context.Background()
	err := agent.collectAndSendMetrics(ctx)
	if err != nil {
		t.Errorf("Failed to collect metrics: %v", err)
	}
}

// Test health checks
func TestPerformHealthChecks(t *testing.T) {
	mockClient := &MockDockerClient{
		info: types.Info{
			ContainersRunning: 1,
		},
	}

	agent := &DockerAgent{
		config: &Config{
			AgentID: "test-agent",
		},
		dockerClient: mockClient,
	}

	ctx := context.Background()
	containerStats := []ContainerStats{
		{
			ID:            "container1",
			Name:          "test-container",
			CPUPercent:    85.0, // High CPU to trigger alert
			MemoryPercent: 50.0,
			MemoryUsage:   1000000,
			MemoryLimit:   2000000,
		},
	}

	alerts, err := agent.performHealthChecks(ctx, containerStats)
	if err != nil {
		t.Errorf("Health checks failed: %v", err)
	}

	// Should have at least one alert for high CPU
	if len(alerts) == 0 {
		t.Error("Expected at least one alert for high CPU usage")
	}

	// Check if the alert is for high CPU usage
	found := false
	for _, alert := range alerts {
		if alertType, ok := alert["alert_type"].(string); ok && alertType == "high_cpu_usage" {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected high CPU usage alert not found")
	}
}

// Test command execution
func TestExecuteCommand(t *testing.T) {
	mockClient := &MockDockerClient{}

	agent := &DockerAgent{
		config: &Config{
			AgentID: "test-agent",
		},
		dockerClient: mockClient,
		httpClient:   &http.Client{},
	}

	ctx := context.Background()

	// Test container start command
	startCommand := map[string]interface{}{
		"id":           "cmd-123",
		"type":         "container_start",
		"container_id": "test-container",
	}

	result, err := agent.startContainer(ctx, startCommand)
	if err != nil {
		t.Errorf("Failed to execute start command: %v", err)
	}

	if result["action"] != "started" {
		t.Errorf("Expected action 'started', got '%v'", result["action"])
	}

	// Test container stop command
	stopCommand := map[string]interface{}{
		"id":           "cmd-124",
		"type":         "container_stop",
		"container_id": "test-container",
		"timeout":      30.0,
	}

	result, err = agent.stopContainer(ctx, stopCommand)
	if err != nil {
		t.Errorf("Failed to execute stop command: %v", err)
	}

	if result["action"] != "stopped" {
		t.Errorf("Expected action 'stopped', got '%v'", result["action"])
	}
}

// Test HTTP server functionality
func TestSendToServer(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))
	defer server.Close()

	agent := &DockerAgent{
		config: &Config{
			AgentID:   "test-agent",
			ServerURL: server.URL,
			APIKey:    "test-key",
		},
		httpClient: &http.Client{},
	}

	testData := map[string]interface{}{
		"test": "data",
	}

	err := agent.sendToServer("/api/test", testData)
	if err != nil {
		t.Errorf("Failed to send data to server: %v", err)
	}
}

// Test alert creation
func TestCreateAlert(t *testing.T) {
	agent := &DockerAgent{
		config: &Config{
			AgentID: "test-agent",
		},
	}

	metadata := map[string]interface{}{
		"container_id": "test-container",
		"cpu_percent":  85.0,
	}

	alert := agent.createAlert("high_cpu_usage", "critical", "High CPU usage detected", metadata)

	if alert["alert_type"] != "high_cpu_usage" {
		t.Errorf("Expected alert_type 'high_cpu_usage', got '%v'", alert["alert_type"])
	}

	if alert["severity"] != "critical" {
		t.Errorf("Expected severity 'critical', got '%v'", alert["severity"])
	}

	if alert["agent_id"] != "test-agent" {
		t.Errorf("Expected agent_id 'test-agent', got '%v'", alert["agent_id"])
	}

	if alertMetadata, ok := alert["metadata"].(map[string]interface{}); ok {
		if alertMetadata["cpu_percent"] != 85.0 {
			t.Errorf("Expected cpu_percent 85.0, got %v", alertMetadata["cpu_percent"])
		}
	} else {
		t.Error("Expected metadata to be present in alert")
	}
}

// Benchmark tests
func BenchmarkCollectMetrics(b *testing.B) {
	mockClient := &MockDockerClient{
		containers: []types.Container{
			{ID: "container1", Names: []string{"/test1"}, State: "running"},
			{ID: "container2", Names: []string{"/test2"}, State: "running"},
		},
		info: types.Info{ContainersRunning: 2},
	}

	agent := &DockerAgent{
		config:       &Config{AgentID: "test-agent"},
		dockerClient: mockClient,
		httpClient:   &http.Client{},
		running:      true,
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		agent.collectAndSendMetrics(ctx)
	}
}

// Integration test (requires actual Docker daemon)
func TestIntegrationDockerConnection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Try to connect to actual Docker daemon
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		t.Skip("Docker daemon not available, skipping integration test")
	}

	ctx := context.Background()
	_, err = cli.Ping(ctx)
	if err != nil {
		t.Skip("Docker daemon not responding, skipping integration test")
	}

	// Test actual Docker operations
	info, err := cli.Info(ctx)
	if err != nil {
		t.Errorf("Failed to get Docker info: %v", err)
	}

	if info.ServerVersion == "" {
		t.Error("Expected non-empty server version")
	}

	t.Logf("Docker server version: %s", info.ServerVersion)
	t.Logf("Running containers: %d", info.ContainersRunning)
}
