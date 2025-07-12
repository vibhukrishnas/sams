package com.sams.monitoring.config;

import com.sams.monitoring.websocket.MetricsWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket Configuration for Real-time Metrics Streaming
 * 
 * Configures WebSocket endpoints for streaming real-time system metrics
 * to connected clients (mobile apps, web dashboards, etc.)
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private MetricsWebSocketHandler metricsWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register WebSocket handler for metrics streaming
        registry.addHandler(metricsWebSocketHandler, "/ws/metrics")
                .setAllowedOrigins("*"); // Allow all origins for development
        
        // Register WebSocket handler with SockJS fallback support
        registry.addHandler(metricsWebSocketHandler, "/ws/metrics-sockjs")
                .setAllowedOrigins("*")
                .withSockJS();
    }
}
