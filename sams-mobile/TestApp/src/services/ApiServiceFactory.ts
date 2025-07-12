/**
 * 🏭 API Service Factory
 * Centralized factory for all API services with dependency injection
 */

import ApiService, { 
  AlertApiService, 
  ServerApiService, 
  AuthApiService, 
  DashboardApiService, 
  VoiceApiService, 
  ReportsApiService 
} from './ApiService';

class ApiServiceFactory {
  private static instance: ApiServiceFactory;
  private apiService: ApiService;
  private alertService: AlertApiService;
  private serverService: ServerApiService;
  private authService: AuthApiService;
  private dashboardService: DashboardApiService;
  private voiceService: VoiceApiService;
  private reportsService: ReportsApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
    this.alertService = new AlertApiService();
    this.serverService = new ServerApiService();
    this.authService = new AuthApiService();
    this.dashboardService = new DashboardApiService();
    this.voiceService = new VoiceApiService();
    this.reportsService = new ReportsApiService();
  }

  static getInstance(): ApiServiceFactory {
    if (!ApiServiceFactory.instance) {
      ApiServiceFactory.instance = new ApiServiceFactory();
    }
    return ApiServiceFactory.instance;
  }

  // Core API service
  getApiService(): ApiService {
    return this.apiService;
  }

  // Specific API services
  getAlertService(): AlertApiService {
    return this.alertService;
  }

  getServerService(): ServerApiService {
    return this.serverService;
  }

  getAuthService(): AuthApiService {
    return this.authService;
  }

  getDashboardService(): DashboardApiService {
    return this.dashboardService;
  }

  getVoiceService(): VoiceApiService {
    return this.voiceService;
  }

  getReportsService(): ReportsApiService {
    return this.reportsService;
  }

  // Convenience methods for common operations
  async healthCheck(): Promise<boolean> {
    return this.apiService.healthCheck();
  }

  isOnline(): boolean {
    return this.apiService.isNetworkOnline();
  }

  getQueuedRequestsCount(): number {
    return this.apiService.getQueuedRequestsCount();
  }

  clearRequestQueue(): void {
    this.apiService.clearRequestQueue();
  }

  // Configuration
  updateApiConfig(config: any): void {
    this.apiService.updateConfig(config);
  }

  getApiConfig(): any {
    return this.apiService.getConfig();
  }
}

// Export singleton instance
const apiServiceFactory = ApiServiceFactory.getInstance();

// Export individual services for convenience
export const apiService = apiServiceFactory.getApiService();
export const alertApi = apiServiceFactory.getAlertService();
export const serverApi = apiServiceFactory.getServerService();
export const authApi = apiServiceFactory.getAuthService();
export const dashboardApi = apiServiceFactory.getDashboardService();
export const voiceApi = apiServiceFactory.getVoiceService();
export const reportsApi = apiServiceFactory.getReportsService();

export default apiServiceFactory;
