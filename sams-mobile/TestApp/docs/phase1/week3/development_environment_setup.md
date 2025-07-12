# 🛠️ **SAMS Mobile - Development Environment Setup**

## **Executive Summary**

This document provides comprehensive development environment setup for SAMS Mobile, including Docker containers, CI/CD pipeline, environment configurations, code quality gates, and testing frameworks for enterprise-grade mobile infrastructure monitoring development.

## **🐳 Docker Development Environment**

### **Docker Compose Configuration**
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15.4
    container_name: sams-postgres-dev
    environment:
      POSTGRES_DB: sams_mobile_dev
      POSTGRES_USER: sams_dev
      POSTGRES_PASSWORD: sams_dev_password
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docs/phase1/database_migrations:/docker-entrypoint-initdb.d
    networks:
      - sams-network

  # InfluxDB Time-Series Database
  influxdb:
    image: influxdb:2.7.4
    container_name: sams-influxdb-dev
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: sams_admin
      DOCKER_INFLUXDB_INIT_PASSWORD: sams_admin_password
      DOCKER_INFLUXDB_INIT_ORG: sams_mobile
      DOCKER_INFLUXDB_INIT_BUCKET: metrics
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: sams-dev-token-12345
    ports:
      - "8086:8086"
    volumes:
      - influxdb_data:/var/lib/influxdb2
    networks:
      - sams-network

  # Redis Cache
  redis:
    image: redis:7.2.3-alpine
    container_name: sams-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - sams-network

  # Elasticsearch for Search and Logging
  elasticsearch:
    image: elasticsearch:8.10.4
    container_name: sams-elasticsearch-dev
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - sams-network

  # Apache Kafka for Event Streaming
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: sams-kafka-dev
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
    networks:
      - sams-network

  # Zookeeper for Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: sams-zookeeper-dev
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    networks:
      - sams-network

  # SAMS Backend API
  sams-api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: sams-api-dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://sams_dev:sams_dev_password@postgres:5432/sams_mobile_dev
      REDIS_URL: redis://redis:6379
      INFLUXDB_URL: http://influxdb:8086
      INFLUXDB_TOKEN: sams-dev-token-12345
      INFLUXDB_ORG: sams_mobile
      INFLUXDB_BUCKET: metrics
      KAFKA_BROKERS: kafka:9092
    ports:
      - "8080:8080"
      - "9229:9229" # Debug port
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
      - influxdb
      - kafka
    networks:
      - sams-network
    command: npm run dev:debug

  # React Native Metro Bundler
  metro:
    build:
      context: .
      dockerfile: Dockerfile.metro
    container_name: sams-metro-dev
    ports:
      - "8081:8081"
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - sams-network
    command: npm start

volumes:
  postgres_data:
  influxdb_data:
  redis_data:
  elasticsearch_data:

networks:
  sams-network:
    driver: bridge
```

### **Development Dockerfile**
```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./
COPY sams-backend-server/package*.json ./sams-backend-server/

# Install dependencies
RUN npm install
RUN cd sams-backend-server && npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 8080 9229

# Development command with debugging
CMD ["npm", "run", "dev:debug"]
```

## **🔄 CI/CD Pipeline Configuration**

### **GitHub Actions Workflow**
```yaml
# .github/workflows/sams-mobile-ci.yml
name: SAMS Mobile CI/CD Pipeline

on:
  push:
    branches: [ main, develop, feature/* ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  JAVA_VERSION: '17'
  ANDROID_API_LEVEL: '33'
  ANDROID_BUILD_TOOLS_VERSION: '33.0.0'

jobs:
  # Code Quality and Security Checks
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd sams-backend-server && npm ci

      - name: ESLint Check
        run: npm run lint

      - name: Prettier Check
        run: npm run format:check

      - name: TypeScript Check
        run: npm run type-check

      - name: Security Audit
        run: npm audit --audit-level=high

      - name: SonarQube Scan
        uses: sonarqube-quality-gate-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # Backend API Tests
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15.4
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: sams_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7.2.3
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd sams-backend-server && npm ci

      - name: Run Backend Unit Tests
        run: cd sams-backend-server && npm test
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/sams_test
          REDIS_URL: redis://localhost:6379

      - name: Run Backend Integration Tests
        run: cd sams-backend-server && npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/sams_test
          REDIS_URL: redis://localhost:6379

      - name: Generate Coverage Report
        run: cd sams-backend-server && npm run test:coverage

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./sams-backend-server/coverage/lcov.info

  # React Native Tests
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run React Native Tests
        run: npm test -- --coverage --watchAll=false

      - name: Run E2E Tests
        run: npm run test:e2e

  # Android Build
  android-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
        with:
          api-level: ${{ env.ANDROID_API_LEVEL }}
          build-tools: ${{ env.ANDROID_BUILD_TOOLS_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build Android APK
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk

  # iOS Build (macOS runner required)
  ios-build:
    runs-on: macos-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - name: Install dependencies
        run: npm ci

      - name: Install CocoaPods
        run: |
          cd ios
          pod install

      - name: Build iOS App
        run: |
          cd ios
          xcodebuild -workspace TestApp.xcworkspace -scheme TestApp -configuration Debug -sdk iphonesimulator -derivedDataPath build

  # Performance Tests
  performance-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Load Tests
        run: npm run test:load

      - name: Run Performance Tests
        run: npm run test:performance

  # Security Tests
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'SAMS Mobile'
          path: '.'
          format: 'HTML'

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # Deployment
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [code-quality, backend-tests, mobile-tests, android-build]
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: echo "Deploying to staging environment"
        # Add actual deployment steps here

  deploy-production:
    runs-on: ubuntu-latest
    needs: [code-quality, backend-tests, mobile-tests, android-build, performance-tests, security-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: echo "Deploying to production environment"
        # Add actual deployment steps here
```

## **🌍 Environment Configurations**

### **Development Environment**
```bash
# .env.development
NODE_ENV=development
PORT=8080
DEBUG=sams:*

# Database Configuration
DATABASE_URL=postgresql://sams_dev:sams_dev_password@localhost:5432/sams_mobile_dev
REDIS_URL=redis://localhost:6379

# InfluxDB Configuration
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=sams-dev-token-12345
INFLUXDB_ORG=sams_mobile
INFLUXDB_BUCKET=metrics

# External Services
FIREBASE_PROJECT_ID=sams-mobile-dev
GOOGLE_SPEECH_API_KEY=your-dev-api-key
TWILIO_ACCOUNT_SID=your-dev-account-sid
TWILIO_AUTH_TOKEN=your-dev-auth-token

# Security
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# Logging
LOG_LEVEL=debug
LOG_FORMAT=dev
```

### **Staging Environment**
```bash
# .env.staging
NODE_ENV=staging
PORT=8080

# Database Configuration
DATABASE_URL=postgresql://sams_staging:secure_password@staging-db:5432/sams_mobile_staging
REDIS_URL=redis://staging-redis:6379

# InfluxDB Configuration
INFLUXDB_URL=http://staging-influxdb:8086
INFLUXDB_TOKEN=staging-token-secure
INFLUXDB_ORG=sams_mobile
INFLUXDB_BUCKET=metrics

# External Services
FIREBASE_PROJECT_ID=sams-mobile-staging
GOOGLE_SPEECH_API_KEY=staging-api-key
TWILIO_ACCOUNT_SID=staging-account-sid
TWILIO_AUTH_TOKEN=staging-auth-token

# Security
JWT_SECRET=staging-jwt-secret-key-very-secure
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
```

### **Production Environment**
```bash
# .env.production
NODE_ENV=production
PORT=8080

# Database Configuration (use secrets management)
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# InfluxDB Configuration
INFLUXDB_URL=${INFLUXDB_URL}
INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
INFLUXDB_ORG=sams_mobile
INFLUXDB_BUCKET=metrics

# External Services
FIREBASE_PROJECT_ID=sams-mobile-prod
GOOGLE_SPEECH_API_KEY=${GOOGLE_SPEECH_API_KEY}
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}

# Security
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=14

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

## **🔍 Code Quality Gates**

### **ESLint Configuration**
```json
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks', 'jest'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.*'],
      env: {
        jest: true
      }
    }
  ]
};
```

### **Prettier Configuration**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### **SonarQube Configuration**
```properties
# sonar-project.properties
sonar.projectKey=sams-mobile
sonar.projectName=SAMS Mobile
sonar.projectVersion=1.0.0

sonar.sources=src,sams-backend-server/src
sonar.tests=__tests__,sams-backend-server/__tests__
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.test.js

sonar.javascript.lcov.reportPaths=coverage/lcov.info,sams-backend-server/coverage/lcov.info
sonar.coverage.exclusions=**/*.test.*,**/node_modules/**

sonar.qualitygate.wait=true
```

## **🧪 Testing Framework Setup**

### **Jest Configuration**
```json
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/?(*.)+(spec|test).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'sams-backend-server/src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@api/(.*)$': '<rootDir>/sams-backend-server/src/$1'
  }
};
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm start\"",
    "dev:api": "cd sams-backend-server && npm run dev",
    "dev:debug": "cd sams-backend-server && npm run dev:debug",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "detox test",
    "test:integration": "cd sams-backend-server && npm run test:integration",
    "test:load": "artillery run load-tests/api-load-test.yml",
    "test:performance": "lighthouse-ci autorun",
    
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace TestApp.xcworkspace -scheme TestApp -configuration Release",
    
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:test": "docker-compose -f docker-compose.test.yml up --abort-on-container-exit",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up -d"
  }
}
```

---

*This comprehensive development environment setup provides a production-ready foundation for SAMS Mobile development with Docker containerization, automated CI/CD pipeline, multiple environment configurations, code quality gates, and comprehensive testing frameworks.*
