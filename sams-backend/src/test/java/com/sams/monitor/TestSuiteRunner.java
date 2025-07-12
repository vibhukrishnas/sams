package com.sams.monitor;

import org.junit.platform.suite.api.IncludeClassNamePatterns;
import org.junit.platform.suite.api.SelectPackages;
import org.junit.platform.suite.api.Suite;
import org.junit.platform.suite.api.SuiteDisplayName;

/**
 * Comprehensive Test Suite Runner for SAMS Backend
 * Executes all test categories with proper reporting
 */
@Suite
@SuiteDisplayName("SAMS Backend Test Suite")
@SelectPackages({
    "com.sams.monitor.service",
    "com.sams.monitor.repository", 
    "com.sams.monitor.integration",
    "com.sams.monitor.contract",
    "com.sams.monitor.performance",
    "com.sams.monitor.security"
})
@IncludeClassNamePatterns(".*Test")
public class TestSuiteRunner {
    // Test suite configuration and execution
}
