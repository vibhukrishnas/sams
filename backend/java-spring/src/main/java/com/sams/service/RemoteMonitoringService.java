package com.sams.service;

import com.sams.model.SystemMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;

import java.io.IOException;
import java.net.InetAddress;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Remote Server Monitoring Service
 * Monitors remote servers via HTTP, SSH, and Ping
 */
@Service
@Slf4j
public class RemoteMonitoringService {

    private final CloseableHttpClient httpClient;

    public RemoteMonitoringService() {
        this.httpClient = HttpClients.createDefault();
    }

    /**
     * Monitor multiple remote servers
     */
    public List<SystemMetrics.RemoteServerMetrics> monitorRemoteServers() {
        List<SystemMetrics.RemoteServerMetrics> results = new ArrayList<>();
        
        // Default servers for demonstration
        List<RemoteServer> servers = Arrays.asList(
            new RemoteServer("Production API", "api.github.com", "http", "https://api.github.com", null, 0, 5000),
            new RemoteServer("Google DNS", "8.8.8.8", "ping", null, null, 0, 3000),
            new RemoteServer("Local Server", "localhost", "http", "http://localhost:5000", null, 0, 5000),
            new RemoteServer("Database Server", "127.0.0.1", "ping", null, null, 0, 2000)
        );
        
        // Monitor servers in parallel
        List<CompletableFuture<SystemMetrics.RemoteServerMetrics>> futures = servers.stream()
                .map(server -> CompletableFuture.supplyAsync(() -> monitorSingleServer(server)))
                .toList();
        
        // Collect results
        futures.forEach(future -> {
            try {
                results.add(future.get(10, TimeUnit.SECONDS));
            } catch (Exception e) {
                log.error("Error monitoring server: {}", e.getMessage());
                results.add(createErrorServerMetrics("Unknown", "unknown", e.getMessage()));
            }
        });
        
        return results;
    }

    /**
     * Monitor a single remote server
     */
    public SystemMetrics.RemoteServerMetrics monitorSingleServer(RemoteServer server) {
        switch (server.type.toLowerCase()) {
            case "http":
            case "https":
                return monitorHttpServer(server);
            case "ssh":
                return monitorSshServer(server);
            case "ping":
                return monitorPingServer(server);
            default:
                return createErrorServerMetrics(server.name, server.host, "Unknown server type: " + server.type);
        }
    }

    /**
     * Monitor HTTP/HTTPS server
     */
    private SystemMetrics.RemoteServerMetrics monitorHttpServer(RemoteServer server) {
        long startTime = System.currentTimeMillis();
        
        try {
            HttpGet request = new HttpGet(server.url);
            request.setHeader("User-Agent", "SAMS-Java-Monitor/1.0");
            
            try (var response = httpClient.execute(request)) {
                long responseTime = System.currentTimeMillis() - startTime;
                int statusCode = response.getCode();
                boolean online = statusCode >= 200 && statusCode < 400;
                
                Map<String, Object> details = new HashMap<>();
                details.put("statusCode", statusCode);
                details.put("reasonPhrase", response.getReasonPhrase());
                details.put("httpVersion", response.getVersion().toString());
                
                // Get response headers
                Map<String, String> headers = new HashMap<>();
                Arrays.stream(response.getHeaders()).forEach(header -> 
                    headers.put(header.getName(), header.getValue()));
                details.put("headers", headers);
                
                return SystemMetrics.RemoteServerMetrics.builder()
                        .name(server.name)
                        .host(server.host)
                        .type(server.type)
                        .online(online)
                        .responseTime(responseTime)
                        .status(online ? "ONLINE" : "HTTP_ERROR_" + statusCode)
                        .details(details)
                        .lastCheck(LocalDateTime.now())
                        .build();
            }
            
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            log.error("HTTP monitoring failed for {}: {}", server.name, e.getMessage());
            
            return createErrorServerMetrics(server.name, server.host, e.getMessage(), responseTime);
        }
    }

    /**
     * Monitor SSH server
     */
    private SystemMetrics.RemoteServerMetrics monitorSshServer(RemoteServer server) {
        long startTime = System.currentTimeMillis();
        
        try {
            JSch jsch = new JSch();
            Session session = jsch.getSession(server.username != null ? server.username : "root", 
                                            server.host, 
                                            server.port > 0 ? server.port : 22);
            
            session.setConfig("StrictHostKeyChecking", "no");
            session.setTimeout(server.timeout);
            
            session.connect();
            long responseTime = System.currentTimeMillis() - startTime;
            
            Map<String, Object> details = new HashMap<>();
            details.put("serverVersion", session.getServerVersion());
            details.put("clientVersion", session.getClientVersion());
            details.put("connected", session.isConnected());
            
            session.disconnect();
            
            return SystemMetrics.RemoteServerMetrics.builder()
                    .name(server.name)
                    .host(server.host)
                    .type(server.type)
                    .online(true)
                    .responseTime(responseTime)
                    .status("ONLINE")
                    .details(details)
                    .lastCheck(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            log.error("SSH monitoring failed for {}: {}", server.name, e.getMessage());
            
            return createErrorServerMetrics(server.name, server.host, e.getMessage(), responseTime);
        }
    }

    /**
     * Monitor server via ping
     */
    private SystemMetrics.RemoteServerMetrics monitorPingServer(RemoteServer server) {
        long startTime = System.currentTimeMillis();
        
        try {
            InetAddress address = InetAddress.getByName(server.host);
            boolean reachable = address.isReachable(server.timeout);
            long responseTime = System.currentTimeMillis() - startTime;
            
            Map<String, Object> details = new HashMap<>();
            details.put("hostAddress", address.getHostAddress());
            details.put("canonicalHostName", address.getCanonicalHostName());
            details.put("reachable", reachable);
            
            return SystemMetrics.RemoteServerMetrics.builder()
                    .name(server.name)
                    .host(server.host)
                    .type(server.type)
                    .online(reachable)
                    .responseTime(responseTime)
                    .status(reachable ? "ONLINE" : "UNREACHABLE")
                    .details(details)
                    .lastCheck(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            log.error("Ping monitoring failed for {}: {}", server.name, e.getMessage());
            
            return createErrorServerMetrics(server.name, server.host, e.getMessage(), responseTime);
        }
    }

    private SystemMetrics.RemoteServerMetrics createErrorServerMetrics(String name, String host, String error) {
        return createErrorServerMetrics(name, host, error, 0L);
    }

    private SystemMetrics.RemoteServerMetrics createErrorServerMetrics(String name, String host, String error, long responseTime) {
        Map<String, Object> details = new HashMap<>();
        details.put("error", error);
        
        return SystemMetrics.RemoteServerMetrics.builder()
                .name(name)
                .host(host)
                .type("unknown")
                .online(false)
                .responseTime(responseTime)
                .status("ERROR")
                .details(details)
                .lastCheck(LocalDateTime.now())
                .build();
    }

    /**
     * Helper class for remote server configuration
     */
    private static class RemoteServer {
        final String name;
        final String host;
        final String type;
        final String url;
        final String username;
        final int port;
        final int timeout;

        RemoteServer(String name, String host, String type, String url, String username, int port, int timeout) {
            this.name = name;
            this.host = host;
            this.type = type;
            this.url = url;
            this.username = username;
            this.port = port;
            this.timeout = timeout;
        }
    }

    /**
     * Cleanup resources
     */
    public void cleanup() {
        try {
            httpClient.close();
        } catch (IOException e) {
            log.error("Error closing HTTP client: {}", e.getMessage());
        }
    }
}
