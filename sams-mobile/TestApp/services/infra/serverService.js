import AsyncStorage from '@react-native-async-storage/async-storage';

class ServerService {
  constructor() {
    this.servers = [
      {
        id: '1',
        name: 'Web Server 01',
        hostname: 'web-server-01',
        ip: '192.168.1.10',
        status: 'online',
        type: 'web',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 45,
          memory: 62,
          disk: 78,
          network: 12
        }
      },
      {
        id: '2',
        name: 'Database Server 01',
        hostname: 'db-server-01',
        ip: '192.168.1.11',
        status: 'online',
        type: 'database',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 28,
          memory: 85,
          disk: 45,
          network: 8
        }
      },
      {
        id: '3',
        name: 'Load Balancer 01',
        hostname: 'lb-server-01',
        ip: '192.168.1.12',
        status: 'online',
        type: 'loadbalancer',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 15,
          memory: 35,
          disk: 25,
          network: 5
        }
      }
    ];
  }

  /**
   * Get all servers
   * @returns {Array} Array of servers
   */
  getServers() {
    return this.servers;
  }

  /**
   * Get server by ID
   * @param {string} serverId - Server ID
   * @returns {object|null} Server object or null
   */
  getServer(serverId) {
    return this.servers.find(server => server.id === serverId) || null;
  }

  /**
   * Add new server
   * @param {object} serverData - Server data
   * @returns {Promise<boolean>}
   */
  async addServer(serverData) {
    try {
      const newServer = {
        id: Date.now().toString(),
        ...serverData,
        status: 'unknown',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0
        }
      };
      
      this.servers.push(newServer);
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('ServerService addServer error:', error);
      return false;
    }
  }

  /**
   * Update server
   * @param {string} serverId - Server ID
   * @param {object} updates - Server updates
   * @returns {Promise<boolean>}
   */
  async updateServer(serverId, updates) {
    try {
      const serverIndex = this.servers.findIndex(server => server.id === serverId);
      if (serverIndex === -1) return false;

      this.servers[serverIndex] = {
        ...this.servers[serverIndex],
        ...updates,
        lastSeen: new Date().toISOString()
      };
      
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('ServerService updateServer error:', error);
      return false;
    }
  }

  /**
   * Delete server
   * @param {string} serverId - Server ID
   * @returns {Promise<boolean>}
   */
  async deleteServer(serverId) {
    try {
      this.servers = this.servers.filter(server => server.id !== serverId);
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('ServerService deleteServer error:', error);
      return false;
    }
  }

  /**
   * Update server metrics
   * @param {string} serverId - Server ID
   * @param {object} metrics - New metrics
   * @returns {Promise<boolean>}
   */
  async updateServerMetrics(serverId, metrics) {
    try {
      const server = this.getServer(serverId);
      if (!server) return false;

      server.metrics = { ...server.metrics, ...metrics };
      server.lastSeen = new Date().toISOString();
      
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('ServerService updateServerMetrics error:', error);
      return false;
    }
  }

  /**
   * Get servers by status
   * @param {string} status - Server status
   * @returns {Array} Array of servers with specified status
   */
  getServersByStatus(status) {
    return this.servers.filter(server => server.status === status);
  }

  /**
   * Get servers by type
   * @param {string} type - Server type
   * @returns {Array} Array of servers with specified type
   */
  getServersByType(type) {
    return this.servers.filter(server => server.type === type);
  }

  /**
   * Get servers by environment
   * @param {string} environment - Server environment
   * @returns {Array} Array of servers in specified environment
   */
  getServersByEnvironment(environment) {
    return this.servers.filter(server => server.environment === environment);
  }

  /**
   * Save servers to storage
   * @returns {Promise<void>}
   */
  async saveServers() {
    try {
      await AsyncStorage.setItem('servers', JSON.stringify(this.servers));
    } catch (error) {
      console.error('ServerService saveServers error:', error);
    }
  }

  /**
   * Load servers from storage
   * @returns {Promise<void>}
   */
  async loadServers() {
    try {
      const servers = await AsyncStorage.getItem('servers');
      if (servers) {
        this.servers = JSON.parse(servers);
      }
    } catch (error) {
      console.error('ServerService loadServers error:', error);
    }
  }

  /**
   * Initialize server service
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadServers();
  }
}

export default new ServerService();
