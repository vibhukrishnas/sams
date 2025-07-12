import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-netinfo/netinfo';
import BackgroundTimer from 'react-native-background-timer';

interface BatteryOptimizationConfig {
  enabled: boolean;
  aggressiveMode: boolean;
  lowBatteryThreshold: number;
  criticalBatteryThreshold: number;
  backgroundSyncInterval: number;
  maxConcurrentRequests: number;
  enableLocationOptimization: boolean;
  enableNetworkOptimization: boolean;
  enableCPUOptimization: boolean;
  enableMemoryOptimization: boolean;
}

interface BatteryMetrics {
  level: number;
  isCharging: boolean;
  powerSaveMode: boolean;
  temperature: number;
  voltage: number;
  estimatedTimeRemaining: number;
  drainRate: number;
  lastMeasurement: number;
}

interface OptimizationAction {
  id: string;
  type: 'reduce_sync' | 'disable_animations' | 'reduce_quality' | 'pause_background' | 'limit_network';
  timestamp: number;
  batteryLevel: number;
  description: string;
  impact: 'low' | 'medium' | 'high';
  active: boolean;
}

interface PowerProfile {
  name: 'performance' | 'balanced' | 'power_saver' | 'ultra_saver';
  description: string;
  settings: {
    syncInterval: number;
    animationsEnabled: boolean;
    backgroundProcessing: boolean;
    networkOptimization: boolean;
    locationAccuracy: 'high' | 'medium' | 'low';
    screenBrightness: number;
    hapticFeedback: boolean;
  };
}

class BatteryOptimizationService {
  private static instance: BatteryOptimizationService;
  private config: BatteryOptimizationConfig;
  private metrics: BatteryMetrics;
  private activeOptimizations: OptimizationAction[] = [];
  private batteryHistory: Array<{ timestamp: number; level: number }> = [];
  private isMonitoring = false;
  private monitoringInterval?: any;
  private appStateListener?: any;
  private networkListener?: any;
  private currentProfile: PowerProfile['name'] = 'balanced';

  private powerProfiles: Record<PowerProfile['name'], PowerProfile> = {
    performance: {
      name: 'performance',
      description: 'Maximum performance, higher battery usage',
      settings: {
        syncInterval: 30000, // 30 seconds
        animationsEnabled: true,
        backgroundProcessing: true,
        networkOptimization: false,
        locationAccuracy: 'high',
        screenBrightness: 1.0,
        hapticFeedback: true,
      },
    },
    balanced: {
      name: 'balanced',
      description: 'Balanced performance and battery life',
      settings: {
        syncInterval: 60000, // 1 minute
        animationsEnabled: true,
        backgroundProcessing: true,
        networkOptimization: true,
        locationAccuracy: 'medium',
        screenBrightness: 0.8,
        hapticFeedback: true,
      },
    },
    power_saver: {
      name: 'power_saver',
      description: 'Extended battery life, reduced performance',
      settings: {
        syncInterval: 300000, // 5 minutes
        animationsEnabled: false,
        backgroundProcessing: false,
        networkOptimization: true,
        locationAccuracy: 'low',
        screenBrightness: 0.6,
        hapticFeedback: false,
      },
    },
    ultra_saver: {
      name: 'ultra_saver',
      description: 'Maximum battery conservation',
      settings: {
        syncInterval: 900000, // 15 minutes
        animationsEnabled: false,
        backgroundProcessing: false,
        networkOptimization: true,
        locationAccuracy: 'low',
        screenBrightness: 0.4,
        hapticFeedback: false,
      },
    },
  };

  constructor() {
    this.config = {
      enabled: true,
      aggressiveMode: false,
      lowBatteryThreshold: 20,
      criticalBatteryThreshold: 10,
      backgroundSyncInterval: 60000,
      maxConcurrentRequests: 3,
      enableLocationOptimization: true,
      enableNetworkOptimization: true,
      enableCPUOptimization: true,
      enableMemoryOptimization: true,
    };

    this.metrics = {
      level: 100,
      isCharging: false,
      powerSaveMode: false,
      temperature: 0,
      voltage: 0,
      estimatedTimeRemaining: 0,
      drainRate: 0,
      lastMeasurement: Date.now(),
    };
  }

  static getInstance(): BatteryOptimizationService {
    if (!BatteryOptimizationService.instance) {
      BatteryOptimizationService.instance = new BatteryOptimizationService();
    }
    return BatteryOptimizationService.instance;
  }

  /**
   * Initialize battery optimization
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('🔋 Initializing battery optimization...');

    try {
      await this.loadConfiguration();
      await this.loadBatteryHistory();
      await this.updateBatteryMetrics();
      this.setupEventListeners();
      this.startMonitoring();
      
      this.isMonitoring = true;
      console.log('✅ Battery optimization initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize battery optimization:', error);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('battery_optimization_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      const savedProfile = await AsyncStorage.getItem('power_profile');
      if (savedProfile) {
        this.currentProfile = JSON.parse(savedProfile);
      }
    } catch (error) {
      console.warn('Failed to load battery optimization config:', error);
    }
  }

  /**
   * Load battery history
   */
  private async loadBatteryHistory(): Promise<void> {
    try {
      const savedHistory = await AsyncStorage.getItem('battery_history');
      if (savedHistory) {
        this.batteryHistory = JSON.parse(savedHistory);
        
        // Keep only last 24 hours of data
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        this.batteryHistory = this.batteryHistory.filter(entry => entry.timestamp > cutoff);
      }
    } catch (error) {
      console.warn('Failed to load battery history:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // App state changes
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        this.handleAppBackground();
      } else if (nextAppState === 'active') {
        this.handleAppForeground();
      }
    });

    // Network state changes
    this.networkListener = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });

    // Battery state changes (if available)
    if (Platform.OS === 'ios') {
      DeviceEventEmitter.addListener('batteryLevelDidChange', this.handleBatteryChange.bind(this));
      DeviceEventEmitter.addListener('batteryStateDidChange', this.handleBatteryStateChange.bind(this));
    }
  }

  /**
   * Start battery monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateBatteryMetrics();
      this.evaluateOptimizations();
      this.saveBatteryHistory();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update battery metrics
   */
  private async updateBatteryMetrics(): Promise<void> {
    try {
      const [batteryLevel, isCharging, powerSaveMode] = await Promise.all([
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.isBatteryCharging(),
        DeviceInfo.isPowerSaveMode(),
      ]);

      const now = Date.now();
      const timeDiff = now - this.metrics.lastMeasurement;
      const levelDiff = this.metrics.level - (batteryLevel * 100);
      
      // Calculate drain rate (% per hour)
      if (timeDiff > 0 && !isCharging) {
        this.metrics.drainRate = (levelDiff / timeDiff) * (60 * 60 * 1000);
      }

      // Estimate time remaining
      if (this.metrics.drainRate > 0 && !isCharging) {
        this.metrics.estimatedTimeRemaining = (batteryLevel * 100) / this.metrics.drainRate * 60; // minutes
      }

      this.metrics = {
        ...this.metrics,
        level: batteryLevel * 100,
        isCharging,
        powerSaveMode,
        lastMeasurement: now,
      };

      // Record in history
      this.batteryHistory.push({
        timestamp: now,
        level: this.metrics.level,
      });

      // Keep only last 24 hours
      const cutoff = now - (24 * 60 * 60 * 1000);
      this.batteryHistory = this.batteryHistory.filter(entry => entry.timestamp > cutoff);

    } catch (error) {
      console.warn('Failed to update battery metrics:', error);
    }
  }

  /**
   * Evaluate and apply optimizations
   */
  private evaluateOptimizations(): void {
    if (!this.config.enabled) return;

    const { level, isCharging, powerSaveMode } = this.metrics;

    // Don't optimize while charging
    if (isCharging) {
      this.removeAllOptimizations();
      return;
    }

    // Critical battery level
    if (level <= this.config.criticalBatteryThreshold) {
      this.applyUltraSaverMode();
    }
    // Low battery level
    else if (level <= this.config.lowBatteryThreshold) {
      this.applyPowerSaverMode();
    }
    // System power save mode
    else if (powerSaveMode) {
      this.applyPowerSaverMode();
    }
    // Normal operation
    else {
      this.applyCurrentProfile();
    }
  }

  /**
   * Apply ultra saver mode
   */
  private applyUltraSaverMode(): void {
    this.setPowerProfile('ultra_saver');
    
    this.applyOptimization({
      type: 'pause_background',
      description: 'Paused background processing to conserve battery',
      impact: 'high',
    });

    this.applyOptimization({
      type: 'limit_network',
      description: 'Limited network requests to essential only',
      impact: 'high',
    });

    this.applyOptimization({
      type: 'disable_animations',
      description: 'Disabled animations to reduce CPU usage',
      impact: 'medium',
    });
  }

  /**
   * Apply power saver mode
   */
  private applyPowerSaverMode(): void {
    this.setPowerProfile('power_saver');
    
    this.applyOptimization({
      type: 'reduce_sync',
      description: 'Reduced sync frequency to conserve battery',
      impact: 'medium',
    });

    this.applyOptimization({
      type: 'reduce_quality',
      description: 'Reduced image quality and effects',
      impact: 'low',
    });
  }

  /**
   * Apply current profile settings
   */
  private applyCurrentProfile(): void {
    const profile = this.powerProfiles[this.currentProfile];
    
    // Remove optimizations that don't match current profile
    this.activeOptimizations = this.activeOptimizations.filter(opt => {
      if (this.currentProfile === 'performance') {
        return false; // Remove all optimizations in performance mode
      }
      return true;
    });

    // Apply profile-specific settings
    this.applyProfileSettings(profile);
  }

  /**
   * Apply optimization
   */
  private applyOptimization(optimization: Omit<OptimizationAction, 'id' | 'timestamp' | 'batteryLevel' | 'active'>): void {
    // Check if already applied
    const existing = this.activeOptimizations.find(opt => opt.type === optimization.type);
    if (existing && existing.active) return;

    const optimizationAction: OptimizationAction = {
      id: this.generateOptimizationId(),
      timestamp: Date.now(),
      batteryLevel: this.metrics.level,
      active: true,
      ...optimization,
    };

    this.activeOptimizations.push(optimizationAction);
    this.executeOptimization(optimizationAction);

    console.log(`🔋 Applied optimization: ${optimization.description}`);
  }

  /**
   * Execute optimization
   */
  private executeOptimization(optimization: OptimizationAction): void {
    switch (optimization.type) {
      case 'reduce_sync':
        this.reduceSyncFrequency();
        break;
      case 'disable_animations':
        this.disableAnimations();
        break;
      case 'reduce_quality':
        this.reduceQuality();
        break;
      case 'pause_background':
        this.pauseBackgroundProcessing();
        break;
      case 'limit_network':
        this.limitNetworkRequests();
        break;
    }
  }

  /**
   * Optimization implementations
   */
  private reduceSyncFrequency(): void {
    // Increase sync intervals
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'sync_interval_changed',
      interval: this.powerProfiles[this.currentProfile].settings.syncInterval,
    });
  }

  private disableAnimations(): void {
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'animations_disabled',
      enabled: false,
    });
  }

  private reduceQuality(): void {
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'quality_reduced',
      imageQuality: 0.7,
      effectsEnabled: false,
    });
  }

  private pauseBackgroundProcessing(): void {
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'background_processing_paused',
      enabled: false,
    });
  }

  private limitNetworkRequests(): void {
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'network_limited',
      maxConcurrent: 1,
      cacheFirst: true,
    });
  }

  /**
   * Remove all optimizations
   */
  private removeAllOptimizations(): void {
    this.activeOptimizations.forEach(opt => {
      opt.active = false;
    });

    // Restore normal settings
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'restore_normal',
    });

    console.log('🔋 Removed all battery optimizations');
  }

  /**
   * Set power profile
   */
  async setPowerProfile(profileName: PowerProfile['name']): Promise<void> {
    this.currentProfile = profileName;
    const profile = this.powerProfiles[profileName];
    
    await AsyncStorage.setItem('power_profile', JSON.stringify(profileName));
    this.applyProfileSettings(profile);
    
    console.log(`🔋 Switched to ${profile.name} power profile`);
  }

  /**
   * Apply profile settings
   */
  private applyProfileSettings(profile: PowerProfile): void {
    DeviceEventEmitter.emit('battery_optimization', {
      type: 'profile_changed',
      profile: profile.name,
      settings: profile.settings,
    });
  }

  /**
   * Handle app background
   */
  private handleAppBackground(): void {
    if (this.config.enableCPUOptimization) {
      // Reduce background activity
      BackgroundTimer.stop();
    }
  }

  /**
   * Handle app foreground
   */
  private handleAppForeground(): void {
    // Resume normal activity
    this.updateBatteryMetrics();
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(networkState: any): void {
    if (this.config.enableNetworkOptimization) {
      if (networkState.type === 'cellular' && !this.metrics.isCharging) {
        // Reduce network activity on cellular
        this.applyOptimization({
          type: 'limit_network',
          description: 'Limited network usage on cellular connection',
          impact: 'medium',
        });
      }
    }
  }

  /**
   * Handle battery level change
   */
  private handleBatteryChange(batteryLevel: number): void {
    this.metrics.level = batteryLevel * 100;
    this.evaluateOptimizations();
  }

  /**
   * Handle battery state change
   */
  private handleBatteryStateChange(batteryState: any): void {
    this.metrics.isCharging = batteryState.charging;
    this.evaluateOptimizations();
  }

  /**
   * Save battery history
   */
  private async saveBatteryHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('battery_history', JSON.stringify(this.batteryHistory));
    } catch (error) {
      console.warn('Failed to save battery history:', error);
    }
  }

  /**
   * Get battery statistics
   */
  getBatteryStatistics(): any {
    const now = Date.now();
    const last24h = this.batteryHistory.filter(entry => entry.timestamp > now - (24 * 60 * 60 * 1000));
    const last1h = this.batteryHistory.filter(entry => entry.timestamp > now - (60 * 60 * 1000));

    return {
      current: this.metrics,
      profile: this.currentProfile,
      activeOptimizations: this.activeOptimizations.filter(opt => opt.active).length,
      history: {
        last24Hours: last24h.length,
        last1Hour: last1h.length,
        averageDrainRate: this.calculateAverageDrainRate(last24h),
      },
      optimizations: this.activeOptimizations.map(opt => ({
        type: opt.type,
        description: opt.description,
        impact: opt.impact,
        active: opt.active,
        appliedAt: opt.timestamp,
      })),
    };
  }

  /**
   * Calculate average drain rate
   */
  private calculateAverageDrainRate(history: Array<{ timestamp: number; level: number }>): number {
    if (history.length < 2) return 0;

    const sorted = history.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    const timeDiff = last.timestamp - first.timestamp;
    const levelDiff = first.level - last.level;
    
    if (timeDiff > 0) {
      return (levelDiff / timeDiff) * (60 * 60 * 1000); // % per hour
    }
    
    return 0;
  }

  /**
   * Get available power profiles
   */
  getPowerProfiles(): PowerProfile[] {
    return Object.values(this.powerProfiles);
  }

  /**
   * Get current power profile
   */
  getCurrentProfile(): PowerProfile {
    return this.powerProfiles[this.currentProfile];
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<BatteryOptimizationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('battery_optimization_config', JSON.stringify(this.config));
  }

  /**
   * Generate optimization ID
   */
  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.appStateListener) {
      this.appStateListener.remove();
    }

    if (this.networkListener) {
      this.networkListener();
    }

    this.removeAllOptimizations();
    this.isMonitoring = false;
    
    console.log('🔋 Battery optimization service stopped');
  }
}

export default BatteryOptimizationService;
export { BatteryOptimizationConfig, BatteryMetrics, OptimizationAction, PowerProfile };
