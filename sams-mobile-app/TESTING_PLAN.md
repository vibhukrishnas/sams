# SAMS Mobile App Testing Plan

## 🎯 Testing Objectives

1. **Functionality Testing**: Verify all features work as expected
2. **Integration Testing**: Ensure mobile app integrates properly with backends
3. **Performance Testing**: Validate app performance and responsiveness
4. **Security Testing**: Test authentication and data security
5. **UI/UX Testing**: Ensure smooth user experience
6. **Cross-Platform Testing**: Verify compatibility across devices

## 📋 Manual Testing Checklist

### ✅ Core Functionality Tests

#### 1. App Launch & Navigation
- [ ] App launches successfully in Android emulator
- [ ] App launches successfully on web browser (localhost:8083)
- [ ] Navigation between tabs works smoothly
- [ ] App handles device rotation correctly
- [ ] App responds to touch interactions

#### 2. System Monitoring Dashboard
- [ ] Dashboard displays CPU usage metrics
- [ ] Dashboard displays Memory usage metrics
- [ ] Dashboard displays Disk usage metrics
- [ ] Dashboard displays Network status
- [ ] Real-time updates work correctly
- [ ] Metrics are visually represented properly (charts/gauges)

#### 3. Authentication System
- [ ] PIN setup for first-time users
- [ ] PIN authentication works correctly
- [ ] Failed authentication attempts are handled
- [ ] Account lockout after 5 failed attempts
- [ ] Session timeout works (15 minutes)
- [ ] Biometric authentication (if available)
- [ ] Logout functionality

#### 4. Configuration Management
- [ ] Server configuration can be set
- [ ] Server connection testing works
- [ ] App settings can be modified
- [ ] Configuration export/import functionality
- [ ] Settings persist after app restart

#### 5. Notification System
- [ ] Notifications display correctly
- [ ] Priority-based notification handling
- [ ] Notification history is maintained
- [ ] Critical alerts are highlighted
- [ ] Notification dismissal works

### ✅ Backend Integration Tests

#### 1. Java Backend (Port 8080)
- [ ] Health check endpoint responds
- [ ] System metrics API returns data
- [ ] WebSocket connection established
- [ ] Real-time metric updates received
- [ ] API response times < 2 seconds

#### 2. Python Backend (Port 8081)
- [ ] Health check endpoint responds
- [ ] System metrics API returns data
- [ ] API response times < 2 seconds
- [ ] Data consistency with Java backend

#### 3. Cross-Backend Communication
- [ ] Mobile app can switch between backends
- [ ] Data consistency across backends
- [ ] Failover handling when one backend is down

### ✅ Performance Tests

#### 1. Response Times
- [ ] App startup time < 3 seconds
- [ ] Navigation transitions < 500ms
- [ ] API requests complete < 2 seconds
- [ ] Real-time updates don't lag

#### 2. Memory Usage
- [ ] App memory usage remains stable
- [ ] No memory leaks during extended use
- [ ] Efficient handling of metric data

#### 3. Battery Performance
- [ ] App doesn't drain battery excessively
- [ ] Background processing is optimized

### ✅ Security Tests

#### 1. Authentication Security
- [ ] PIN is stored securely (encrypted)
- [ ] Session tokens are handled properly
- [ ] Sensitive data is cleared on logout
- [ ] Biometric data is protected

#### 2. Network Security
- [ ] API communications are secure
- [ ] No sensitive data in logs
- [ ] Proper error handling without exposing internals

### ✅ UI/UX Tests

#### 1. Visual Design
- [ ] Glassmorphism design renders correctly
- [ ] Dark theme is consistent
- [ ] Color scheme is professional
- [ ] Icons and graphics are clear

#### 2. Responsiveness
- [ ] UI adapts to different screen sizes
- [ ] Touch targets are appropriately sized
- [ ] Loading states are displayed
- [ ] Error states are user-friendly

#### 3. Accessibility
- [ ] Text is readable
- [ ] Touch targets meet size requirements
- [ ] App works with accessibility features

## 🔧 Automated Test Execution

### Run All Tests
```bash
cd D:\Projects\SAMS\sams-mobile-app
npm test
```

### Run Tests by Category
```bash
# Service tests only
npm run test:services

# Integration tests only  
npm run test:integration

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📊 Test Environment Setup

### Prerequisites
- ✅ Android emulator running (Pixel_8)
- ✅ Java backend running (port 8080)
- ✅ Python backend running (port 8081)
- ✅ Mobile app running (port 8083)

### Test Data
- Default PIN: 1234 (for testing)
- Test server configs: localhost:8080, localhost:8081
- Sample metrics data for validation

## 🐛 Known Issues & Workarounds

1. **Metro bundler timeout**: If bundling takes too long, restart Expo server
2. **Android emulator slow**: Ensure hardware acceleration is enabled
3. **Network timeouts**: Check firewall settings for localhost access

## 📈 Success Criteria

### Critical Tests (Must Pass)
- [ ] App launches successfully
- [ ] Authentication system works
- [ ] Backend connectivity established
- [ ] Real-time metrics display
- [ ] No crashes or fatal errors

### Performance Benchmarks
- [ ] App startup < 3 seconds
- [ ] API responses < 2 seconds
- [ ] Memory usage stable
- [ ] Smooth 60fps animations

### Code Quality
- [ ] Test coverage > 70%
- [ ] No TypeScript errors
- [ ] No critical linting issues
- [ ] All services properly mocked

## 🎯 Next Steps After Testing

1. **Bug Fixes**: Address any issues found during testing
2. **Performance Optimization**: Improve any slow areas
3. **Feature Enhancement**: Add any missing functionality
4. **Production Deployment**: Prepare for production release
5. **Documentation**: Update user guides and API docs
