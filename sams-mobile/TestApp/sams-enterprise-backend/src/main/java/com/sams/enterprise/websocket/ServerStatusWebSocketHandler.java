package com.sams.enterprise.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

/**
 * Server Status WebSocket Handler
 */
@Component
public class ServerStatusWebSocketHandler implements WebSocketHandler {

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Handle connection established
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        // Handle incoming messages
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        // Handle transport errors
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        // Handle connection closed
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
}
