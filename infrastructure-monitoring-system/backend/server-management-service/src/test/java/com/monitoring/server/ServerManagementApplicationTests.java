package com.monitoring.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * Integration tests for Server Management Service Application
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "logging.level.com.monitoring=DEBUG"
})
class ServerManagementApplicationTests {

    @Test
    void contextLoads() {
        // Test that the Spring context loads successfully
    }

    @Test
    void applicationStartsSuccessfully() {
        // Test that the application starts without errors
    }
}
