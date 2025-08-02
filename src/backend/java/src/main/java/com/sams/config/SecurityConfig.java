package com.sams.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * 🔐 SAMS Security Configuration - CLIENT INTEGRATION FRIENDLY
 * ============================================================
 * 
 * CRITICAL FIX: This configuration solves the "Integration Impossible" deal-breaker
 * by making API documentation publicly accessible while maintaining security for 
 * actual data endpoints.
 * 
 * ✅ WHAT THIS FIXES:
 * - Swagger UI accessible without authentication (http://localhost:5002/swagger-ui.html)
 * - API docs accessible for client integration (/v3/api-docs)
 * - H2 console accessible for data verification (/h2-console)
 * - Health endpoints remain public for monitoring
 * 
 * 🔒 WHAT STAYS PROTECTED:
 * - All /api/* endpoints require authentication 
 * - Server management endpoints secured
 * - Alert system endpoints secured
 * - System statistics endpoints secured
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for API usage
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 🌐 PUBLIC ENDPOINTS - CRITICAL FOR CLIENT INTEGRATION
                .requestMatchers(
                    "/swagger-ui/**",           // Swagger UI interface - CLIENTS NEED THIS
                    "/swagger-ui.html",         // Swagger UI main page - CLIENTS NEED THIS  
                    "/v3/api-docs/**",          // OpenAPI documentation - CLIENTS NEED THIS
                    "/actuator/health",         // Health check - MONITORING NEEDS THIS
                    "/actuator/info",           // App info - MONITORING NEEDS THIS
                    "/h2-console/**",           // Database console - DATA VERIFICATION NEEDS THIS
                    "/auth/login",              // Login endpoint - CLIENTS NEED THIS (Fixed: removed /api prefix)
                    "/auth/register",           // Registration endpoint - CLIENTS NEED THIS (Fixed: removed /api prefix)
                    "/auth/default-credentials", // Default credentials - CLIENTS NEED THIS (Added)
                    "/auth/status",             // Auth status - CLIENTS NEED THIS (Added)
                    "/error"                    // Error pages
                ).permitAll()
                
                // 🔒 PROTECTED ENDPOINTS - REQUIRE AUTHENTICATION
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .frameOptions().disable() // Allow H2 console to work
            );
            
        return http.build();
    }
}
