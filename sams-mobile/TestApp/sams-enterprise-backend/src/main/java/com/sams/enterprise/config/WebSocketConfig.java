package com.sams.enterprise.config;

import com.sams.enterprise.websocket.AlertWebSocketHandler;
import com.sams.enterprise.websocket.ServerStatusWebSocketHandler;
import com.sams.enterprise.websocket.WebSocketAuthInterceptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Enterprise WebSocket Configuration for Real-time Communication
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private AlertWebSocketHandler alertWebSocketHandler;

    @Autowired
    private ServerStatusWebSocketHandler serverStatusWebSocketHandler;

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Alert notifications WebSocket
        registry.addHandler(alertWebSocketHandler, "/ws/alerts")
                .addInterceptors(webSocketAuthInterceptor)
                .setAllowedOrigins("*"); // Configure properly for production

        // Server status updates WebSocket
        registry.addHandler(serverStatusWebSocketHandler, "/ws/server-status")
                .addInterceptors(webSocketAuthInterceptor)
                .setAllowedOrigins("*"); // Configure properly for production

        // General system events WebSocket
        registry.addHandler(alertWebSocketHandler, "/ws/system-events")
                .addInterceptors(webSocketAuthInterceptor)
                .setAllowedOrigins("*"); // Configure properly for production
    }
}
