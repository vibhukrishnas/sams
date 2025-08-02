package com.sams.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Generic API Response wrapper for consistent response format
 * Used by both mobile app and web console
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    
    private boolean success;
    private String message;
    private T data;
    private String error;
    private long timestamp;
    
    // Private constructor to enforce factory methods
    private ApiResponse() {
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * Create successful response with data
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.data = data;
        response.message = message;
        return response;
    }
    
    /**
     * Create successful response without data
     */
    public static <T> ApiResponse<T> success(String message) {
        return success(null, message);
    }
    
    /**
     * Create error response
     */
    public static <T> ApiResponse<T> error(String error) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.error = error;
        return response;
    }
    
    /**
     * Create error response with message
     */
    public static <T> ApiResponse<T> error(String error, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.error = error;
        response.message = message;
        return response;
    }
    
    // Getters (no setters to maintain immutability)
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public T getData() { return data; }
    public String getError() { return error; }
    public long getTimestamp() { return timestamp; }
}
