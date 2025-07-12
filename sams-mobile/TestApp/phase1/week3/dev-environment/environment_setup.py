#!/usr/bin/env python3
"""
SAMS Development Environment Setup
Creates complete development environment with Docker, CI/CD, and testing frameworks
"""

import os
import json
import yaml
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SAMSDevEnvironmentSetup:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.output_dir = self.base_dir / "dev_environment_output"
        self.output_dir.mkdir(exist_ok=True)
        self.environments = ["development", "staging", "production"]
        
    def create_docker_development_environment(self):
        """Create Docker containers for complete development environment"""
        
        # Main development Docker Compose
        dev_compose = {
            "version": "3.8",
            "services": {
                # Infrastructure Services
                "postgres-dev": {
                    "image": "postgres:15-alpine",
                    "container_name": "sams-postgres-dev",
                    "environment": {
                        "POSTGRES_DB": "sams_dev",
                        "POSTGRES_USER": "sams_dev",
                        "POSTGRES_PASSWORD": "dev123",
                        "POSTGRES_MULTIPLE_DATABASES": "sams_test,sams_integration"
                    },
                    "ports": ["5432:5432"],
                    "volumes": [
                        "postgres_dev_data:/var/lib/postgresql/data",
                        "./database/init:/docker-entrypoint-initdb.d",
                        "./database/schemas:/schemas"
                    ],
                    "networks": ["sams-dev-network"],
                    "healthcheck": {
                        "test": ["CMD-SHELL", "pg_isready -U sams_dev -d sams_dev"],
                        "interval": "30s",
                        "timeout": "10s",
                        "retries": 3
                    }
                },
                "redis-dev": {
                    "image": "redis:7-alpine",
                    "container_name": "sams-redis-dev",
                    "ports": ["6379:6379"],
                    "volumes": ["redis_dev_data:/data"],
                    "networks": ["sams-dev-network"],
                    "command": "redis-server --appendonly yes --requirepass dev123",
                    "healthcheck": {
                        "test": ["CMD", "redis-cli", "-a", "dev123", "ping"],
                        "interval": "30s",
                        "timeout": "10s",
                        "retries": 3
                    }
                },
                "influxdb-dev": {
                    "image": "influxdb:2.7-alpine",
                    "container_name": "sams-influxdb-dev",
                    "environment": {
                        "INFLUXDB_DB": "sams_metrics",
                        "INFLUXDB_ADMIN_USER": "admin",
                        "INFLUXDB_ADMIN_PASSWORD": "admin123",
                        "INFLUXDB_USER": "sams_dev",
                        "INFLUXDB_USER_PASSWORD": "dev123"
                    },
                    "ports": ["8086:8086"],
                    "volumes": [
                        "influxdb_dev_data:/var/lib/influxdb2",
                        "./influxdb/config:/etc/influxdb2"
                    ],
                    "networks": ["sams-dev-network"],
                    "healthcheck": {
                        "test": ["CMD", "curl", "-f", "http://localhost:8086/health"],
                        "interval": "30s",
                        "timeout": "10s",
                        "retries": 3
                    }
                },
                "kafka-dev": {
                    "image": "confluentinc/cp-kafka:7.5.0",
                    "container_name": "sams-kafka-dev",
                    "environment": {
                        "KAFKA_ZOOKEEPER_CONNECT": "zookeeper-dev:2181",
                        "KAFKA_ADVERTISED_LISTENERS": "PLAINTEXT://localhost:9092",
                        "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR": "1",
                        "KAFKA_AUTO_CREATE_TOPICS_ENABLE": "true",
                        "KAFKA_LOG_RETENTION_HOURS": "24"
                    },
                    "ports": ["9092:9092"],
                    "networks": ["sams-dev-network"],
                    "depends_on": ["zookeeper-dev"],
                    "healthcheck": {
                        "test": ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"],
                        "interval": "30s",
                        "timeout": "10s",
                        "retries": 3
                    }
                },
                "zookeeper-dev": {
                    "image": "confluentinc/cp-zookeeper:7.5.0",
                    "container_name": "sams-zookeeper-dev",
                    "environment": {
                        "ZOOKEEPER_CLIENT_PORT": "2181",
                        "ZOOKEEPER_TICK_TIME": "2000"
                    },
                    "networks": ["sams-dev-network"]
                },
                
                # Development Tools
                "sonarqube-dev": {
                    "image": "sonarqube:10.3-community",
                    "container_name": "sams-sonarqube-dev",
                    "environment": {
                        "SONAR_JDBC_URL": "jdbc:postgresql://postgres-dev:5432/sonarqube",
                        "SONAR_JDBC_USERNAME": "sonar",
                        "SONAR_JDBC_PASSWORD": "sonar123"
                    },
                    "ports": ["9000:9000"],
                    "networks": ["sams-dev-network"],
                    "depends_on": ["postgres-dev"],
                    "volumes": [
                        "sonarqube_data:/opt/sonarqube/data",
                        "sonarqube_logs:/opt/sonarqube/logs",
                        "sonarqube_extensions:/opt/sonarqube/extensions"
                    ]
                },
                "mailhog-dev": {
                    "image": "mailhog/mailhog:latest",
                    "container_name": "sams-mailhog-dev",
                    "ports": ["1025:1025", "8025:8025"],
                    "networks": ["sams-dev-network"]
                },
                "prometheus-dev": {
                    "image": "prom/prometheus:v2.48.0",
                    "container_name": "sams-prometheus-dev",
                    "ports": ["9090:9090"],
                    "volumes": [
                        "./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml",
                        "prometheus_data:/prometheus"
                    ],
                    "networks": ["sams-dev-network"],
                    "command": [
                        "--config.file=/etc/prometheus/prometheus.yml",
                        "--storage.tsdb.path=/prometheus",
                        "--web.console.libraries=/etc/prometheus/console_libraries",
                        "--web.console.templates=/etc/prometheus/consoles",
                        "--storage.tsdb.retention.time=200h",
                        "--web.enable-lifecycle"
                    ]
                },
                "grafana-dev": {
                    "image": "grafana/grafana:10.2.0",
                    "container_name": "sams-grafana-dev",
                    "environment": {
                        "GF_SECURITY_ADMIN_PASSWORD": "admin123"
                    },
                    "ports": ["3001:3000"],
                    "volumes": [
                        "grafana_data:/var/lib/grafana",
                        "./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards",
                        "./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources"
                    ],
                    "networks": ["sams-dev-network"]
                }
            },
            "volumes": {
                "postgres_dev_data": {},
                "redis_dev_data": {},
                "influxdb_dev_data": {},
                "sonarqube_data": {},
                "sonarqube_logs": {},
                "sonarqube_extensions": {},
                "prometheus_data": {},
                "grafana_data": {}
            },
            "networks": {
                "sams-dev-network": {
                    "driver": "bridge",
                    "ipam": {
                        "config": [{"subnet": "172.20.0.0/16"}]
                    }
                }
            }
        }
        
        # Save Docker Compose file
        with open(self.output_dir / "docker-compose.dev.yml", "w") as f:
            yaml.dump(dev_compose, f, default_flow_style=False, sort_keys=False)
        
        # Create database initialization script
        db_init_script = """#!/bin/bash
set -e

# Create multiple databases
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE sams_test;
    CREATE DATABASE sams_integration;
    CREATE DATABASE sonarqube;
    
    CREATE USER sonar WITH PASSWORD 'sonar123';
    GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonar;
    
    -- Create development schemas
    \\c sams_dev;
    CREATE SCHEMA IF NOT EXISTS users;
    CREATE SCHEMA IF NOT EXISTS servers;
    CREATE SCHEMA IF NOT EXISTS alerts;
    CREATE SCHEMA IF NOT EXISTS notifications;
    
    \\c sams_test;
    CREATE SCHEMA IF NOT EXISTS users;
    CREATE SCHEMA IF NOT EXISTS servers;
    CREATE SCHEMA IF NOT EXISTS alerts;
    CREATE SCHEMA IF NOT EXISTS notifications;
EOSQL
"""
        
        # Create database directory and init script
        db_dir = self.output_dir / "database" / "init"
        db_dir.mkdir(parents=True, exist_ok=True)
        
        with open(db_dir / "01-init-databases.sh", "w") as f:
            f.write(db_init_script)
        
        # Make script executable
        os.chmod(db_dir / "01-init-databases.sh", 0o755)
        
        return dev_compose
    
    def create_github_actions_pipeline(self):
        """Create GitHub Actions CI/CD pipeline"""
        
        # Main CI/CD workflow
        ci_workflow = {
            "name": "SAMS CI/CD Pipeline",
            "on": {
                "push": {
                    "branches": ["main", "develop", "feature/*"]
                },
                "pull_request": {
                    "branches": ["main", "develop"]
                }
            },
            "env": {
                "JAVA_VERSION": "17",
                "NODE_VERSION": "18",
                "DOCKER_REGISTRY": "ghcr.io",
                "IMAGE_NAME": "sams"
            },
            "jobs": {
                "code-quality": {
                    "runs-on": "ubuntu-latest",
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4",
                            "with": {"fetch-depth": 0}
                        },
                        {
                            "name": "Set up Java",
                            "uses": "actions/setup-java@v3",
                            "with": {
                                "java-version": "${{ env.JAVA_VERSION }}",
                                "distribution": "temurin"
                            }
                        },
                        {
                            "name": "Cache Maven dependencies",
                            "uses": "actions/cache@v3",
                            "with": {
                                "path": "~/.m2",
                                "key": "${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}",
                                "restore-keys": "${{ runner.os }}-m2"
                            }
                        },
                        {
                            "name": "Run Maven checkstyle",
                            "run": "mvn checkstyle:check"
                        },
                        {
                            "name": "Run SpotBugs analysis",
                            "run": "mvn spotbugs:check"
                        },
                        {
                            "name": "Set up Node.js",
                            "uses": "actions/setup-node@v3",
                            "with": {"node-version": "${{ env.NODE_VERSION }}"}
                        },
                        {
                            "name": "Install frontend dependencies",
                            "run": "cd frontend && npm ci"
                        },
                        {
                            "name": "Run ESLint",
                            "run": "cd frontend && npm run lint"
                        },
                        {
                            "name": "Run Prettier check",
                            "run": "cd frontend && npm run format:check"
                        }
                    ]
                },
                "backend-tests": {
                    "runs-on": "ubuntu-latest",
                    "services": {
                        "postgres": {
                            "image": "postgres:15",
                            "env": {
                                "POSTGRES_PASSWORD": "test123",
                                "POSTGRES_DB": "sams_test"
                            },
                            "options": "--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5",
                            "ports": ["5432:5432"]
                        },
                        "redis": {
                            "image": "redis:7",
                            "options": "--health-cmd \"redis-cli ping\" --health-interval 10s --health-timeout 5s --health-retries 5",
                            "ports": ["6379:6379"]
                        }
                    },
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4"
                        },
                        {
                            "name": "Set up Java",
                            "uses": "actions/setup-java@v3",
                            "with": {
                                "java-version": "${{ env.JAVA_VERSION }}",
                                "distribution": "temurin"
                            }
                        },
                        {
                            "name": "Cache Maven dependencies",
                            "uses": "actions/cache@v3",
                            "with": {
                                "path": "~/.m2",
                                "key": "${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}",
                                "restore-keys": "${{ runner.os }}-m2"
                            }
                        },
                        {
                            "name": "Run unit tests",
                            "run": "mvn test",
                            "env": {
                                "SPRING_PROFILES_ACTIVE": "test",
                                "DB_HOST": "localhost",
                                "DB_PORT": "5432",
                                "REDIS_HOST": "localhost",
                                "REDIS_PORT": "6379"
                            }
                        },
                        {
                            "name": "Run integration tests",
                            "run": "mvn verify -P integration-tests",
                            "env": {
                                "SPRING_PROFILES_ACTIVE": "integration",
                                "DB_HOST": "localhost",
                                "DB_PORT": "5432",
                                "REDIS_HOST": "localhost",
                                "REDIS_PORT": "6379"
                            }
                        },
                        {
                            "name": "Generate test report",
                            "run": "mvn jacoco:report"
                        },
                        {
                            "name": "Upload coverage to Codecov",
                            "uses": "codecov/codecov-action@v3",
                            "with": {
                                "file": "./target/site/jacoco/jacoco.xml",
                                "flags": "backend"
                            }
                        }
                    ]
                },
                "frontend-tests": {
                    "runs-on": "ubuntu-latest",
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4"
                        },
                        {
                            "name": "Set up Node.js",
                            "uses": "actions/setup-node@v3",
                            "with": {"node-version": "${{ env.NODE_VERSION }}"}
                        },
                        {
                            "name": "Cache Node modules",
                            "uses": "actions/cache@v3",
                            "with": {
                                "path": "frontend/node_modules",
                                "key": "${{ runner.os }}-node-${{ hashFiles('frontend/package-lock.json') }}",
                                "restore-keys": "${{ runner.os }}-node-"
                            }
                        },
                        {
                            "name": "Install dependencies",
                            "run": "cd frontend && npm ci"
                        },
                        {
                            "name": "Run unit tests",
                            "run": "cd frontend && npm run test:coverage"
                        },
                        {
                            "name": "Run E2E tests",
                            "run": "cd frontend && npm run test:e2e"
                        },
                        {
                            "name": "Upload coverage to Codecov",
                            "uses": "codecov/codecov-action@v3",
                            "with": {
                                "file": "./frontend/coverage/lcov.info",
                                "flags": "frontend"
                            }
                        }
                    ]
                },
                "mobile-tests": {
                    "runs-on": "ubuntu-latest",
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4"
                        },
                        {
                            "name": "Set up Node.js",
                            "uses": "actions/setup-node@v3",
                            "with": {"node-version": "${{ env.NODE_VERSION }}"}
                        },
                        {
                            "name": "Cache Node modules",
                            "uses": "actions/cache@v3",
                            "with": {
                                "path": "mobile/node_modules",
                                "key": "${{ runner.os }}-node-${{ hashFiles('mobile/package-lock.json') }}",
                                "restore-keys": "${{ runner.os }}-node-"
                            }
                        },
                        {
                            "name": "Install dependencies",
                            "run": "cd mobile && npm ci"
                        },
                        {
                            "name": "Run unit tests",
                            "run": "cd mobile && npm run test:coverage"
                        },
                        {
                            "name": "Type check",
                            "run": "cd mobile && npm run type-check"
                        }
                    ]
                },
                "security-scan": {
                    "runs-on": "ubuntu-latest",
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4"
                        },
                        {
                            "name": "Run Trivy vulnerability scanner",
                            "uses": "aquasecurity/trivy-action@master",
                            "with": {
                                "scan-type": "fs",
                                "scan-ref": ".",
                                "format": "sarif",
                                "output": "trivy-results.sarif"
                            }
                        },
                        {
                            "name": "Upload Trivy scan results",
                            "uses": "github/codeql-action/upload-sarif@v2",
                            "with": {"sarif_file": "trivy-results.sarif"}
                        }
                    ]
                },
                "build-and-push": {
                    "runs-on": "ubuntu-latest",
                    "needs": ["code-quality", "backend-tests", "frontend-tests", "mobile-tests", "security-scan"],
                    "if": "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'",
                    "steps": [
                        {
                            "name": "Checkout code",
                            "uses": "actions/checkout@v4"
                        },
                        {
                            "name": "Set up Docker Buildx",
                            "uses": "docker/setup-buildx-action@v3"
                        },
                        {
                            "name": "Log in to Container Registry",
                            "uses": "docker/login-action@v3",
                            "with": {
                                "registry": "${{ env.DOCKER_REGISTRY }}",
                                "username": "${{ github.actor }}",
                                "password": "${{ secrets.GITHUB_TOKEN }}"
                            }
                        },
                        {
                            "name": "Extract metadata",
                            "id": "meta",
                            "uses": "docker/metadata-action@v5",
                            "with": {
                                "images": "${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ env.IMAGE_NAME }}",
                                "tags": |
                                  type=ref,event=branch
                                  type=ref,event=pr
                                  type=sha,prefix={{branch}}-
                                  type=raw,value=latest,enable={{is_default_branch}}"
                            }
                        },
                        {
                            "name": "Build and push Docker images",
                            "uses": "docker/build-push-action@v5",
                            "with": {
                                "context": ".",
                                "platforms": "linux/amd64,linux/arm64",
                                "push": True,
                                "tags": "${{ steps.meta.outputs.tags }}",
                                "labels": "${{ steps.meta.outputs.labels }}",
                                "cache-from": "type=gha",
                                "cache-to": "type=gha,mode=max"
                            }
                        }
                    ]
                }
            }
        }
        
        # Create .github/workflows directory
        workflows_dir = self.output_dir / ".github" / "workflows"
        workflows_dir.mkdir(parents=True, exist_ok=True)
        
        # Save CI/CD workflow
        with open(workflows_dir / "ci-cd.yml", "w") as f:
            yaml.dump(ci_workflow, f, default_flow_style=False, sort_keys=False)
        
        return ci_workflow

    def create_environment_configurations(self):
        """Create configuration files for different environments"""

        configurations = {}

        for env in self.environments:
            config = {
                "spring": {
                    "profiles": {"active": env},
                    "datasource": {
                        "url": f"jdbc:postgresql://postgres-{env}:5432/sams_{env}",
                        "username": "${DB_USERNAME}",
                        "password": "${DB_PASSWORD}",
                        "hikari": {
                            "maximum-pool-size": 20 if env == "production" else 10,
                            "minimum-idle": 5 if env == "production" else 2,
                            "connection-timeout": 30000,
                            "idle-timeout": 600000,
                            "max-lifetime": 1800000
                        }
                    },
                    "redis": {
                        "host": f"redis-{env}",
                        "port": 6379,
                        "password": "${REDIS_PASSWORD}",
                        "timeout": 2000,
                        "lettuce": {
                            "pool": {
                                "max-active": 8,
                                "max-idle": 8,
                                "min-idle": 0
                            }
                        }
                    },
                    "kafka": {
                        "bootstrap-servers": f"kafka-{env}:9092",
                        "producer": {
                            "key-serializer": "org.apache.kafka.common.serialization.StringSerializer",
                            "value-serializer": "org.springframework.kafka.support.serializer.JsonSerializer",
                            "acks": "all" if env == "production" else "1",
                            "retries": 3,
                            "batch-size": 16384,
                            "linger-ms": 5
                        },
                        "consumer": {
                            "key-deserializer": "org.apache.kafka.common.serialization.StringDeserializer",
                            "value-deserializer": "org.springframework.kafka.support.serializer.JsonDeserializer",
                            "group-id": f"sams-{env}",
                            "auto-offset-reset": "earliest",
                            "enable-auto-commit": False
                        }
                    }
                },
                "influxdb": {
                    "url": f"http://influxdb-{env}:8086",
                    "username": "${INFLUXDB_USERNAME}",
                    "password": "${INFLUXDB_PASSWORD}",
                    "database": f"sams_metrics_{env}",
                    "retention-policy": "autogen",
                    "connect-timeout": 10000,
                    "read-timeout": 30000,
                    "write-timeout": 10000
                },
                "management": {
                    "endpoints": {
                        "web": {
                            "exposure": {
                                "include": "health,metrics,prometheus,info" if env != "production" else "health,metrics,prometheus"
                            }
                        }
                    },
                    "endpoint": {
                        "health": {
                            "show-details": "always" if env == "development" else "when-authorized"
                        }
                    },
                    "metrics": {
                        "export": {
                            "prometheus": {"enabled": True}
                        }
                    }
                },
                "logging": {
                    "level": {
                        "com.sams": "DEBUG" if env == "development" else "INFO",
                        "org.springframework.security": "DEBUG" if env == "development" else "WARN",
                        "org.springframework.web": "DEBUG" if env == "development" else "WARN",
                        "org.hibernate.SQL": "DEBUG" if env == "development" else "WARN"
                    },
                    "pattern": {
                        "console": "%d{yyyy-MM-dd HH:mm:ss} - %msg%n" if env == "development" else "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
                    }
                },
                "sams": {
                    "security": {
                        "jwt": {
                            "secret": "${JWT_SECRET}",
                            "expiration": 86400000,  # 24 hours
                            "refresh-expiration": 604800000  # 7 days
                        },
                        "cors": {
                            "allowed-origins": [
                                "http://localhost:3000" if env == "development" else f"https://{env}.sams.example.com",
                                "http://localhost:3001" if env == "development" else ""
                            ],
                            "allowed-methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                            "allowed-headers": ["*"],
                            "allow-credentials": True
                        }
                    },
                    "monitoring": {
                        "metrics-retention-days": 7 if env == "development" else (30 if env == "staging" else 90),
                        "alert-evaluation-interval": "1m",
                        "max-concurrent-alerts": 1000 if env == "production" else 100
                    },
                    "notifications": {
                        "email": {
                            "enabled": env != "development",
                            "smtp-host": "${SMTP_HOST}",
                            "smtp-port": 587,
                            "username": "${SMTP_USERNAME}",
                            "password": "${SMTP_PASSWORD}"
                        },
                        "slack": {
                            "enabled": env == "production",
                            "webhook-url": "${SLACK_WEBHOOK_URL}"
                        }
                    }
                }
            }

            configurations[env] = config

            # Save environment-specific configuration
            config_dir = self.output_dir / "config" / env
            config_dir.mkdir(parents=True, exist_ok=True)

            with open(config_dir / "application.yml", "w") as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)

        return configurations

    def create_testing_frameworks(self):
        """Create testing framework configurations"""

        # JUnit 5 configuration for backend
        junit_config = """<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <configurationParameters>
        <parameter key="junit.jupiter.execution.parallel.enabled" value="true"/>
        <parameter key="junit.jupiter.execution.parallel.mode.default" value="concurrent"/>
        <parameter key="junit.jupiter.execution.parallel.mode.classes.default" value="concurrent"/>
        <parameter key="junit.jupiter.execution.parallel.config.strategy" value="dynamic"/>
        <parameter key="junit.jupiter.execution.parallel.config.dynamic.factor" value="2"/>
    </configurationParameters>
</configuration>"""

        # TestContainers configuration
        testcontainers_config = """# TestContainers Configuration
testcontainers.reuse.enable=true
testcontainers.checks.disable=true

# Docker configuration
docker.client.strategy=org.testcontainers.dockerclient.EnvironmentAndSystemPropertyClientProviderStrategy

# Logging
logging.level.org.testcontainers=INFO
logging.level.com.github.dockerjava=WARN
"""

        # Jest configuration for frontend
        jest_config = {
            "preset": "ts-jest",
            "testEnvironment": "jsdom",
            "setupFilesAfterEnv": ["<rootDir>/src/test/setup.ts"],
            "moduleNameMapping": {
                "^@/(.*)$": "<rootDir>/src/$1",
                "\\.(css|less|scss|sass)$": "identity-obj-proxy"
            },
            "collectCoverageFrom": [
                "src/**/*.{ts,tsx}",
                "!src/**/*.d.ts",
                "!src/test/**/*",
                "!src/stories/**/*"
            ],
            "coverageThreshold": {
                "global": {
                    "branches": 80,
                    "functions": 80,
                    "lines": 80,
                    "statements": 80
                }
            },
            "testMatch": [
                "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
                "<rootDir>/src/**/*.{test,spec}.{ts,tsx}"
            ],
            "transform": {
                "^.+\\.(ts|tsx)$": "ts-jest"
            },
            "moduleFileExtensions": ["ts", "tsx", "js", "jsx", "json", "node"]
        }

        # Cypress configuration for E2E testing
        cypress_config = {
            "e2e": {
                "baseUrl": "http://localhost:3000",
                "supportFile": "cypress/support/e2e.ts",
                "specPattern": "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
                "viewportWidth": 1280,
                "viewportHeight": 720,
                "video": True,
                "screenshotOnRunFailure": True,
                "defaultCommandTimeout": 10000,
                "requestTimeout": 10000,
                "responseTimeout": 10000
            },
            "component": {
                "devServer": {
                    "framework": "react",
                    "bundler": "vite"
                },
                "specPattern": "src/**/*.cy.{js,jsx,ts,tsx}"
            }
        }

        # Detox configuration for React Native
        detox_config = {
            "testRunner": "jest",
            "runnerConfig": "e2e/jest.config.js",
            "skipLegacyWorkersInjection": True,
            "apps": {
                "ios.debug": {
                    "type": "ios.app",
                    "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/SAMSMobile.app"
                },
                "android.debug": {
                    "type": "android.apk",
                    "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk"
                }
            },
            "devices": {
                "simulator": {
                    "type": "ios.simulator",
                    "device": {"type": "iPhone 14"}
                },
                "emulator": {
                    "type": "android.emulator",
                    "device": {"avdName": "Pixel_4_API_30"}
                }
            },
            "configurations": {
                "ios.sim.debug": {
                    "device": "simulator",
                    "app": "ios.debug"
                },
                "android.emu.debug": {
                    "device": "emulator",
                    "app": "android.debug"
                }
            }
        }

        # Save testing configurations
        test_dir = self.output_dir / "testing"
        test_dir.mkdir(exist_ok=True)

        with open(test_dir / "junit-platform.properties", "w") as f:
            f.write(junit_config)

        with open(test_dir / "testcontainers.properties", "w") as f:
            f.write(testcontainers_config)

        with open(test_dir / "jest.config.json", "w") as f:
            json.dump(jest_config, f, indent=2)

        with open(test_dir / "cypress.config.json", "w") as f:
            json.dump(cypress_config, f, indent=2)

        with open(test_dir / "detox.config.json", "w") as f:
            json.dump(detox_config, f, indent=2)

        return {
            "junit": junit_config,
            "jest": jest_config,
            "cypress": cypress_config,
            "detox": detox_config
        }

    def create_code_quality_gates(self):
        """Create code quality gate configurations"""

        # SonarQube quality gate
        sonar_config = """# SonarQube Configuration
sonar.projectKey=sams-monitoring
sonar.projectName=SAMS - Server and Application Monitoring System
sonar.projectVersion=1.0.0

# Source code configuration
sonar.sources=src/main
sonar.tests=src/test
sonar.java.binaries=target/classes
sonar.java.test.binaries=target/test-classes

# Coverage configuration
sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
sonar.junit.reportPaths=target/surefire-reports

# Quality gate thresholds
sonar.qualitygate.wait=true

# Exclusions
sonar.exclusions=**/*Test.java,**/*IT.java,**/generated/**,**/target/**

# Duplication
sonar.cpd.exclusions=**/*Test.java,**/*IT.java

# Language-specific settings
sonar.java.source=17
sonar.java.target=17
"""

        # ESLint configuration for frontend
        eslint_config = {
            "env": {
                "browser": True,
                "es2021": True,
                "node": True,
                "jest": True
            },
            "extends": [
                "eslint:recommended",
                "@typescript-eslint/recommended",
                "plugin:react/recommended",
                "plugin:react-hooks/recommended",
                "plugin:jsx-a11y/recommended",
                "plugin:import/recommended",
                "plugin:import/typescript",
                "prettier"
            ],
            "parser": "@typescript-eslint/parser",
            "parserOptions": {
                "ecmaFeatures": {"jsx": True},
                "ecmaVersion": "latest",
                "sourceType": "module",
                "project": "./tsconfig.json"
            },
            "plugins": [
                "react",
                "react-hooks",
                "@typescript-eslint",
                "jsx-a11y",
                "import"
            ],
            "rules": {
                "@typescript-eslint/no-unused-vars": "error",
                "@typescript-eslint/no-explicit-any": "warn",
                "@typescript-eslint/explicit-function-return-type": "off",
                "react/react-in-jsx-scope": "off",
                "react/prop-types": "off",
                "react-hooks/rules-of-hooks": "error",
                "react-hooks/exhaustive-deps": "warn",
                "import/order": ["error", {
                    "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
                    "newlines-between": "always"
                }],
                "jsx-a11y/anchor-is-valid": "off",
                "no-console": "warn",
                "no-debugger": "error"
            },
            "settings": {
                "react": {"version": "detect"},
                "import/resolver": {
                    "typescript": {"alwaysTryTypes": True}
                }
            }
        }

        # Prettier configuration
        prettier_config = {
            "semi": True,
            "trailingComma": "es5",
            "singleQuote": True,
            "printWidth": 100,
            "tabWidth": 2,
            "useTabs": False,
            "bracketSpacing": True,
            "bracketSameLine": False,
            "arrowParens": "avoid",
            "endOfLine": "lf"
        }

        # Checkstyle configuration for Java
        checkstyle_config = """<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
    "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
    "https://checkstyle.org/dtds/configuration_1_3.dtd">

<module name="Checker">
    <property name="charset" value="UTF-8"/>
    <property name="severity" value="warning"/>
    <property name="fileExtensions" value="java, properties, xml"/>

    <!-- Checks for whitespace -->
    <module name="FileTabCharacter">
        <property name="eachLine" value="true"/>
    </module>

    <module name="TreeWalker">
        <!-- Checks for Naming Conventions -->
        <module name="ConstantName"/>
        <module name="LocalFinalVariableName"/>
        <module name="LocalVariableName"/>
        <module name="MemberName"/>
        <module name="MethodName"/>
        <module name="PackageName"/>
        <module name="ParameterName"/>
        <module name="StaticVariableName"/>
        <module name="TypeName"/>

        <!-- Checks for imports -->
        <module name="AvoidStarImport"/>
        <module name="IllegalImport"/>
        <module name="RedundantImport"/>
        <module name="UnusedImports"/>

        <!-- Checks for Size Violations -->
        <module name="MethodLength"/>
        <module name="ParameterNumber"/>

        <!-- Checks for whitespace -->
        <module name="EmptyForIteratorPad"/>
        <module name="GenericWhitespace"/>
        <module name="MethodParamPad"/>
        <module name="NoWhitespaceAfter"/>
        <module name="NoWhitespaceBefore"/>
        <module name="OperatorWrap"/>
        <module name="ParenPad"/>
        <module name="TypecastParenPad"/>
        <module name="WhitespaceAfter"/>
        <module name="WhitespaceAround"/>

        <!-- Modifier Checks -->
        <module name="ModifierOrder"/>
        <module name="RedundantModifier"/>

        <!-- Checks for blocks -->
        <module name="AvoidNestedBlocks"/>
        <module name="EmptyBlock"/>
        <module name="LeftCurly"/>
        <module name="NeedBraces"/>
        <module name="RightCurly"/>

        <!-- Checks for common coding problems -->
        <module name="EmptyStatement"/>
        <module name="EqualsHashCode"/>
        <module name="HiddenField"/>
        <module name="IllegalInstantiation"/>
        <module name="InnerAssignment"/>
        <module name="MagicNumber"/>
        <module name="MissingSwitchDefault"/>
        <module name="SimplifyBooleanExpression"/>
        <module name="SimplifyBooleanReturn"/>

        <!-- Checks for class design -->
        <module name="DesignForExtension"/>
        <module name="FinalClass"/>
        <module name="HideUtilityClassConstructor"/>
        <module name="InterfaceIsType"/>
        <module name="VisibilityModifier"/>

        <!-- Miscellaneous other checks -->
        <module name="ArrayTypeStyle"/>
        <module name="FinalParameters"/>
        <module name="TodoComment"/>
        <module name="UpperEll"/>
    </module>
</module>"""

        # Save quality gate configurations
        quality_dir = self.output_dir / "quality"
        quality_dir.mkdir(exist_ok=True)

        with open(quality_dir / "sonar-project.properties", "w") as f:
            f.write(sonar_config)

        with open(quality_dir / ".eslintrc.json", "w") as f:
            json.dump(eslint_config, f, indent=2)

        with open(quality_dir / ".prettierrc.json", "w") as f:
            json.dump(prettier_config, f, indent=2)

        with open(quality_dir / "checkstyle.xml", "w") as f:
            f.write(checkstyle_config)

        return {
            "sonarqube": sonar_config,
            "eslint": eslint_config,
            "prettier": prettier_config,
            "checkstyle": checkstyle_config
        }

    def create_setup_scripts(self):
        """Create automated setup scripts"""

        # Main setup script
        setup_script = """#!/bin/bash
set -e

echo "🚀 Setting up SAMS Development Environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ Java 17+ is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 18+ is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p backend/{user-service,alert-service,server-service,notification-service,api-gateway,websocket-service,common}
mkdir -p frontend/{src,public,tests}
mkdir -p mobile/{src,android,ios,tests}
mkdir -p database/{schemas,migrations,seeds}
mkdir -p monitoring/{prometheus,grafana}
mkdir -p scripts/{deployment,testing,utilities}

# Copy configuration files
echo "📋 Copying configuration files..."
cp config/development/application.yml backend/user-service/src/main/resources/
cp config/development/application.yml backend/alert-service/src/main/resources/
cp config/development/application.yml backend/server-service/src/main/resources/
cp config/development/application.yml backend/notification-service/src/main/resources/
cp config/development/application.yml backend/api-gateway/src/main/resources/
cp config/development/application.yml backend/websocket-service/src/main/resources/

# Set up Docker environment
echo "🐳 Setting up Docker development environment..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.dev.yml ps

# Initialize databases
echo "🗄️ Initializing databases..."
docker-compose -f docker-compose.dev.yml exec postgres-dev psql -U sams_dev -d sams_dev -c "SELECT version();"

# Set up monitoring
echo "📊 Setting up monitoring..."
docker-compose -f docker-compose.dev.yml exec prometheus-dev promtool check config /etc/prometheus/prometheus.yml

echo "✅ SAMS Development Environment setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "  - SonarQube: http://localhost:9000 (admin/admin)"
echo "  - Grafana: http://localhost:3001 (admin/admin123)"
echo "  - Prometheus: http://localhost:9090"
echo "  - MailHog: http://localhost:8025"
echo "  - PostgreSQL: localhost:5432 (sams_dev/dev123)"
echo "  - Redis: localhost:6379"
echo "  - InfluxDB: localhost:8086"
echo ""
echo "📚 Next steps:"
echo "  1. Run 'mvn clean install' in backend directory"
echo "  2. Run 'npm install' in frontend directory"
echo "  3. Run 'npm install' in mobile directory"
echo "  4. Start development servers"
"""

        # Cleanup script
        cleanup_script = """#!/bin/bash
set -e

echo "🧹 Cleaning up SAMS Development Environment..."

# Stop and remove Docker containers
echo "🐳 Stopping Docker containers..."
docker-compose -f docker-compose.dev.yml down -v

# Remove Docker images (optional)
read -p "Remove Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ Removing Docker images..."
    docker-compose -f docker-compose.dev.yml down --rmi all
fi

# Clean build artifacts
echo "🧽 Cleaning build artifacts..."
find . -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

echo "✅ Cleanup complete!"
"""

        # Save setup scripts
        scripts_dir = self.output_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)

        with open(scripts_dir / "setup.sh", "w") as f:
            f.write(setup_script)

        with open(scripts_dir / "cleanup.sh", "w") as f:
            f.write(cleanup_script)

        # Make scripts executable
        os.chmod(scripts_dir / "setup.sh", 0o755)
        os.chmod(scripts_dir / "cleanup.sh", 0o755)

        return {"setup": setup_script, "cleanup": cleanup_script}

    def run_environment_setup(self):
        """Run complete development environment setup"""
        logger.info("🔧 Setting up SAMS Development Environment...")

        # Create all components
        docker_env = self.create_docker_development_environment()
        ci_pipeline = self.create_github_actions_pipeline()
        env_configs = self.create_environment_configurations()
        test_frameworks = self.create_testing_frameworks()
        quality_gates = self.create_code_quality_gates()
        setup_scripts = self.create_setup_scripts()

        # Generate summary
        summary = {
            "environment_setup": {
                "docker_services": len(docker_env["services"]),
                "ci_jobs": len(ci_pipeline["jobs"]),
                "environments": len(env_configs),
                "test_frameworks": len(test_frameworks),
                "quality_gates": len(quality_gates),
                "setup_scripts": len(setup_scripts)
            },
            "generated_files": [
                "docker-compose.dev.yml",
                ".github/workflows/ci-cd.yml",
                "config/*/application.yml",
                "testing/*.json",
                "quality/*",
                "scripts/*.sh"
            ],
            "access_urls": {
                "sonarqube": "http://localhost:9000",
                "grafana": "http://localhost:3001",
                "prometheus": "http://localhost:9090",
                "mailhog": "http://localhost:8025"
            }
        }

        with open(self.output_dir / "environment_setup_summary.json", "w") as f:
            json.dump(summary, f, indent=2)

        logger.info(f"✅ Development environment setup complete!")
        logger.info(f"📁 Output directory: {self.output_dir}")
        logger.info(f"🐳 Generated Docker environment with {len(docker_env['services'])} services")
        logger.info(f"🔄 Generated CI/CD pipeline with {len(ci_pipeline['jobs'])} jobs")
        logger.info(f"⚙️ Generated configurations for {len(env_configs)} environments")

        return summary

if __name__ == "__main__":
    setup = SAMSDevEnvironmentSetup()
    result = setup.run_environment_setup()
    print("🎉 SAMS Development Environment Setup Complete!")
    print(f"📁 Check the '{setup.output_dir}' directory for all generated files")
    print("🚀 Run './scripts/setup.sh' to initialize the development environment")
