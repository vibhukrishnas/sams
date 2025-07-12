# 🌐 API Service Documentation

## Overview

The SAMS Mobile API Service provides a comprehensive, enterprise-grade HTTP client with advanced features including authentication, retry logic, offline support, and error handling.

## Architecture

```
ApiService (Core)
├── AlertApiService
├── ServerApiService  
├── AuthApiService
├── DashboardApiService
├── VoiceApiService
└── ReportsApiService
```

## Features

### ✅ Core Features
- **Singleton Pattern**: Ensures single instance across the app
- **Automatic Authentication**: JWT token management with auto-refresh
- **Retry Logic**: Exponential backoff for failed requests
- **Offline Support**: Request queuing when offline
- **Network Monitoring**: Real-time network status tracking
- **Error Handling**: Comprehensive error normalization
- **Request Logging**: Development-mode request/response logging
- **TypeScript Support**: Full type safety

### ✅ Advanced Features
- **Request Queuing**: Automatic queuing of requests when offline
- **Token Refresh**: Automatic JWT token refresh on 401 errors
- **Request Deduplication**: Prevents duplicate requests
- **Performance Monitoring**: Request timing and metrics
- **Configurable Timeouts**: Customizable request timeouts
- **Request Cancellation**: Ability to cancel ongoing requests

## Usage

### Basic Usage

```typescript
import { apiService, alertApi, serverApi } from '../services/ApiServiceFactory';

// Direct API calls
const alerts = await alertApi.getAlerts({ severity: 'critical' });
const servers = await serverApi.getServers();

// Core API service
const response = await apiService.get('/custom-endpoint');
```

### RTK Query Integration (Recommended)

```typescript
import { useGetAlertsQuery, useGetServersQuery } from '../store/api/samsApi';

const MyComponent = () => {
  const { data: alerts, isLoading, error } = useGetAlertsQuery();
  const { data: servers } = useGetServersQuery();
  
  // Component logic
};
```

### Configuration

```typescript
import ApiService from '../services/ApiService';

const apiService = ApiService.getInstance();

// Update configuration
apiService.updateConfig({
  timeout: 60000,
  retryAttempts: 5,
  enableOfflineQueue: true,
});

// Get current configuration
const config = apiService.getConfig();
```

## API Services

### AlertApiService

```typescript
import { alertApi } from '../services/ApiServiceFactory';

// Get alerts with filters
const alerts = await alertApi.getAlerts({
  severity: 'critical',
  acknowledged: false,
  limit: 10
});

// Acknowledge alert
await alertApi.acknowledgeAlert('alert-id', 'Acknowledged via mobile');

// Resolve alert
await alertApi.resolveAlert('alert-id', 'Issue resolved');

// Emergency SOS
await alertApi.triggerEmergencySOS({
  message: 'Emergency assistance needed',
  location: { lat: 40.7128, lng: -74.0060 }
});
```

### ServerApiService

```typescript
import { serverApi } from '../services/ApiServiceFactory';

// Get all servers
const servers = await serverApi.getServers();

// Add new server
const newServer = await serverApi.addServer({
  name: 'Production Server',
  ip: '192.168.1.100',
  port: 22,
  type: 'linux'
});

// Test connection
const connectionResult = await serverApi.testConnection('server-id');

// Deploy agent
await serverApi.deployAgent('server-id');
```

### AuthApiService

```typescript
import { authApi } from '../services/ApiServiceFactory';

// Login with username/password
const loginResult = await authApi.login({
  username: 'admin',
  password: 'password123'
});

// Login with PIN
const pinLoginResult = await authApi.login({
  username: 'admin',
  pin: '1234'
});

// Get current user
const currentUser = await authApi.getCurrentUser();

// Logout
await authApi.logout('refresh-token');
```

### DashboardApiService

```typescript
import { dashboardApi } from '../services/ApiServiceFactory';

// Get dashboard data
const dashboard = await dashboardApi.getDashboardData();

// Get system health
const health = await dashboardApi.getSystemHealth();
```

### VoiceApiService

```typescript
import { voiceApi } from '../services/ApiServiceFactory';

// Process voice command
const result = await voiceApi.processVoiceCommand({
  transcript: 'show critical alerts',
  confidence: 0.95,
  language: 'en-US'
});
```

## Error Handling

### Error Types

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

### Error Handling Examples

```typescript
try {
  const response = await alertApi.getAlerts();
  if (response.success) {
    console.log('Alerts:', response.data);
  }
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

## Offline Support

The API service automatically handles offline scenarios:

1. **Request Queuing**: Requests are queued when offline
2. **Automatic Retry**: Queued requests are processed when online
3. **Persistence**: Offline requests are persisted across app restarts
4. **Status Monitoring**: Real-time network status tracking

```typescript
// Check network status
const isOnline = apiService.isNetworkOnline();

// Get queued requests count
const queuedCount = apiService.getQueuedRequestsCount();

// Clear request queue
apiService.clearRequestQueue();
```

## Testing

### Unit Tests

```bash
npm test -- ApiService.test.ts
```

### Integration Tests

```typescript
import { alertApi } from '../services/ApiServiceFactory';

describe('Alert API Integration', () => {
  it('should fetch alerts successfully', async () => {
    const alerts = await alertApi.getAlerts();
    expect(alerts.success).toBe(true);
    expect(Array.isArray(alerts.data)).toBe(true);
  });
});
```

## Performance Considerations

### Best Practices

1. **Use RTK Query**: Prefer RTK Query hooks for component data fetching
2. **Cache Management**: RTK Query handles caching automatically
3. **Request Deduplication**: Multiple identical requests are deduplicated
4. **Pagination**: Use pagination for large datasets
5. **Error Boundaries**: Implement error boundaries for API errors

### Monitoring

```typescript
// Monitor API performance
const config = apiService.getConfig();
console.log('API Configuration:', config);

// Track network status
const isOnline = apiService.isNetworkOnline();
console.log('Network Status:', isOnline ? 'Online' : 'Offline');
```

## Security

### Authentication

- **JWT Tokens**: Automatic token management
- **Token Refresh**: Automatic refresh on expiration
- **Secure Storage**: Tokens stored in secure keychain
- **Request Signing**: All requests include authentication headers

### Network Security

- **HTTPS Only**: Production uses HTTPS
- **Certificate Pinning**: SSL certificate validation
- **Request Validation**: Input validation and sanitization
- **Rate Limiting**: Built-in rate limiting support

## Troubleshooting

### Common Issues

1. **Network Errors**: Check network connectivity
2. **Authentication Errors**: Verify token validity
3. **Timeout Errors**: Increase timeout configuration
4. **Offline Issues**: Check offline queue status

### Debug Mode

```typescript
// Enable debug logging
apiService.updateConfig({
  enableRequestLogging: true
});
```

### Health Check

```typescript
// Test API connectivity
const isHealthy = await apiService.healthCheck();
console.log('API Health:', isHealthy ? 'Healthy' : 'Unhealthy');
```

## Migration Guide

### From Old API Service

```typescript
// Old way
import { makeApiCall } from './oldApiService';

// New way
import { alertApi } from './services/ApiServiceFactory';
const alerts = await alertApi.getAlerts();
```

### RTK Query Migration

```typescript
// Old component
const [alerts, setAlerts] = useState([]);
useEffect(() => {
  fetchAlerts().then(setAlerts);
}, []);

// New component with RTK Query
const { data: alerts, isLoading } = useGetAlertsQuery();
```

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility
5. Test offline scenarios thoroughly
