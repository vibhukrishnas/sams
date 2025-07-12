package com.sams.enterprise.controller;

import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Simple Health Check Controller
 */
@RestController
@RequestMapping("/health")
@CrossOrigin(origins = "*")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        return Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now(),
            "service", "SAMS Enterprise Backend",
            "version", "1.0.0"
        );
    }

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("message", "pong");
    }
}
