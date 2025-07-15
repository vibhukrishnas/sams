/**
 * 🚀 Enhanced Database Service
 * Combines multi-database abstraction layer with sharding capabilities
 */

import { DatabaseFactory } from './DatabaseFactory';
import { ShardManager } from './ShardManager';
import { 
  IDatabaseAdapter, 
  DatabaseType, 
  DatabaseConfig, 
  ConnectionConfig,
  QueryResult,
  TransactionContext
} from './interfaces/IDatabaseAdapter';
import { logger } from '../../utils/logger';

interface ShardedDatabaseConfig extends DatabaseConfig {
  sharding: {
    enabled: true;
    shardKey: string;
    shards: {[shardId: string]: ConnectionConfig};
    replicationFactor?: number;
  };
}

export class EnhancedDatabaseService {
  private static shardManagers: Map<string, ShardManager> = new Map();
  private static nonShardedAdapters: Map<string, IDatabaseAdapter> = new Map();
  private static configurations: Map<string, DatabaseConfig | ShardedDatabaseConfig> = new Map();

  /**
   * Initialize the enhanced database service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize database factory
      await DatabaseFactory.initializeFromEnvironment();

      // Setup primary database (non-sharded by default)
      await this.setupPrimaryDatabase();

      // Setup additional databases from configuration
      await this.setupAdditionalDatabases();

      logger.info('Enhanced Database Service initialized successfully');
    } catch (error) {
      logger.error('Enhanced Database Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a database configuration
   */
  static registerDatabase(name: string, config: DatabaseConfig | ShardedDatabaseConfig): void {
    this.configurations.set(name, config);
    
    if (this.isShardedConfig(config)) {
      logger.info(`Sharded database configuration registered: ${name}`);
    } else {
      logger.info(`Non-sharded database configuration registered: ${name}`);
    }
  }

  /**
   * Get database adapter (handles both sharded and non-sharded)
   */
  static async getAdapter(name: string = 'primary'): Promise<IDatabaseAdapter | ShardManager> {
    const config = this.configurations.get(name);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${name}`);
    }

    if (this.isShardedConfig(config)) {
      return this.getShardManager(name);
    } else {
      return this.getNonShardedAdapter(name);
    }
  }

  /**
   * Execute query with automatic routing (sharded vs non-sharded)
   */
  static async executeQuery<T = any>(
    sql: string, 
    params?: any[], 
    dbName: string = 'primary',
    shardKey?: string
  ): Promise<QueryResult<T>> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      const shardManager = this.getShardManager(dbName);
      
      if (shardKey) {
        return await shardManager.queryShardByKey(shardKey, sql, params);
      } else {
        return await shardManager.queryAllShards(sql, params);
      }
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.query<T>(sql, params);
    }
  }

  /**
   * Insert data with automatic sharding
   */
  static async insert(
    table: string, 
    data: any, 
    dbName: string = 'primary'
  ): Promise<any> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      const shardManager = this.getShardManager(dbName);
      await shardManager.distributeData(table, data);
      return data; // Sharded insert doesn't return the inserted record directly
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.insert(table, data);
    }
  }

  /**
   * Update data with automatic shard routing
   */
  static async update(
    table: string, 
    id: string | number, 
    data: any, 
    dbName: string = 'primary',
    shardKey?: string
  ): Promise<any> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      if (!shardKey) {
        throw new Error('Shard key required for sharded database updates');
      }
      
      const shardManager = this.getShardManager(dbName);
      const shardId = shardManager.getShardForKey(shardKey);
      const shard = (shardManager as any).shards.get(shardId);
      
      if (!shard) {
        throw new Error(`Shard not found: ${shardId}`);
      }
      
      return await shard.adapter.update(table, id, data);
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.update(table, id, data);
    }
  }

  /**
   * Delete data with automatic shard routing
   */
  static async delete(
    table: string, 
    id: string | number, 
    dbName: string = 'primary',
    shardKey?: string
  ): Promise<boolean> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      if (!shardKey) {
        throw new Error('Shard key required for sharded database deletes');
      }
      
      const shardManager = this.getShardManager(dbName);
      const shardId = shardManager.getShardForKey(shardKey);
      const shard = (shardManager as any).shards.get(shardId);
      
      if (!shard) {
        throw new Error(`Shard not found: ${shardId}`);
      }
      
      return await shard.adapter.delete(table, id);
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.delete(table, id);
    }
  }

  /**
   * Find by ID with automatic shard routing
   */
  static async findById(
    table: string, 
    id: string | number, 
    dbName: string = 'primary',
    shardKey?: string
  ): Promise<any> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      if (!shardKey) {
        // Query all shards if no shard key provided
        const shardManager = this.getShardManager(dbName);
        const result = await shardManager.queryAllShards(`SELECT * FROM ${table} WHERE id = $1`, [id]);
        return result.data[0];
      }
      
      const shardManager = this.getShardManager(dbName);
      const shardId = shardManager.getShardForKey(shardKey);
      const shard = (shardManager as any).shards.get(shardId);
      
      if (!shard) {
        throw new Error(`Shard not found: ${shardId}`);
      }
      
      return await shard.adapter.findById(table, id);
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.findById(table, id);
    }
  }

  /**
   * Paginate with automatic handling of sharded/non-sharded databases
   */
  static async paginate(
    table: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc',
    dbName: string = 'primary'
  ): Promise<{data: any[], total: number, page: number, limit: number, totalPages: number}> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      // For sharded databases, we need to query all shards and aggregate
      const shardManager = this.getShardManager(dbName);
      
      // Build query with filters
      let whereClause = '';
      const whereValues: any[] = [];
      let paramIndex = 1;
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          if (whereClause) whereClause += ' AND ';
          whereClause += `${key} = $${paramIndex}`;
          whereValues.push(filters[key]);
          paramIndex++;
        }
      });
      
      if (whereClause) whereClause = `WHERE ${whereClause}`;
      
      // Get total count from all shards
      const countResult = await shardManager.queryAllShards(
        `SELECT COUNT(*) as count FROM ${table} ${whereClause}`,
        whereValues
      );
      
      const total = countResult.data.reduce((sum, row) => sum + parseInt(row.count), 0);
      
      // Get paginated data from all shards
      const offset = (page - 1) * limit;
      const dataResult = await shardManager.queryAllShards(
        `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT ${limit} OFFSET ${offset}`,
        whereValues
      );
      
      // Sort and limit the aggregated results
      const sortedData = dataResult.data.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        if (orderDirection === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      }).slice(0, limit);
      
      return {
        data: sortedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      return await adapter.paginate(table, page, limit, filters, orderBy, orderDirection);
    }
  }

  /**
   * Execute transaction across databases
   */
  static async executeTransaction<T>(
    callback: (adapter: IDatabaseAdapter) => Promise<T>,
    dbName: string = 'primary'
  ): Promise<T> {
    const config = this.configurations.get(dbName);
    
    if (!config) {
      throw new Error(`Database configuration not found: ${dbName}`);
    }

    if (this.isShardedConfig(config)) {
      throw new Error('Distributed transactions across shards not yet implemented');
    } else {
      const adapter = await this.getNonShardedAdapter(dbName);
      const transaction = await adapter.beginTransaction();
      
      try {
        const result = await callback(adapter);
        await adapter.commitTransaction(transaction);
        return result;
      } catch (error) {
        await adapter.rollbackTransaction(transaction);
        throw error;
      }
    }
  }

  /**
   * Get health status for all databases
   */
  static async getHealthStatus(): Promise<{[dbName: string]: any}> {
    const healthStatus: {[dbName: string]: any} = {};
    
    for (const [dbName, config] of this.configurations) {
      try {
        if (this.isShardedConfig(config)) {
          const shardManager = this.getShardManager(dbName);
          healthStatus[dbName] = {
            type: 'sharded',
            shards: await shardManager.getShardHealth(),
            statistics: await shardManager.getShardStatistics()
          };
        } else {
          const adapter = await this.getNonShardedAdapter(dbName);
          healthStatus[dbName] = {
            type: 'single',
            healthy: await adapter.healthCheck(),
            metrics: await adapter.getMetrics(),
            dialect: adapter.getDialect()
          };
        }
      } catch (error) {
        healthStatus[dbName] = {
          type: 'error',
          error: error.message
        };
      }
    }
    
    return healthStatus;
  }

  /**
   * Close all database connections
   */
  static async close(): Promise<void> {
    // Close shard managers
    for (const [name, shardManager] of this.shardManagers) {
      try {
        const shardIds = shardManager.getShardIds();
        for (const shardId of shardIds) {
          await shardManager.removeShard(shardId);
        }
      } catch (error) {
        logger.error(`Error closing shard manager ${name}:`, error);
      }
    }
    
    // Close non-sharded adapters
    for (const [name, adapter] of this.nonShardedAdapters) {
      try {
        await adapter.disconnect();
      } catch (error) {
        logger.error(`Error closing adapter ${name}:`, error);
      }
    }
    
    // Close database factory
    await DatabaseFactory.closeAllAdapters();
    
    this.shardManagers.clear();
    this.nonShardedAdapters.clear();
    
    logger.info('Enhanced Database Service closed');
  }

  // Private helper methods
  private static isShardedConfig(config: DatabaseConfig | ShardedDatabaseConfig): config is ShardedDatabaseConfig {
    return 'sharding' in config && config.sharding?.enabled === true;
  }

  private static getShardManager(name: string): ShardManager {
    let shardManager = this.shardManagers.get(name);
    
    if (!shardManager) {
      const config = this.configurations.get(name) as ShardedDatabaseConfig;
      shardManager = new ShardManager();
      
      // Configure shard key
      shardManager.setShardKey(name, config.sharding.shardKey);
      
      // Set replication factor if specified
      if (config.sharding.replicationFactor) {
        shardManager.setReplicationFactor(config.sharding.replicationFactor);
      }
      
      // Add shards
      Object.entries(config.sharding.shards).forEach(async ([shardId, shardConfig]) => {
        try {
          await shardManager!.addShard(shardId, shardConfig);
        } catch (error) {
          logger.error(`Failed to add shard ${shardId}:`, error);
        }
      });
      
      this.shardManagers.set(name, shardManager);
    }
    
    return shardManager;
  }

  private static async getNonShardedAdapter(name: string): Promise<IDatabaseAdapter> {
    let adapter = this.nonShardedAdapters.get(name);
    
    if (!adapter) {
      adapter = await DatabaseFactory.createAdapterWithFailover(name);
      this.nonShardedAdapters.set(name, adapter);
    }
    
    return adapter;
  }

  private static async setupPrimaryDatabase(): Promise<void> {
    // Primary database is typically non-sharded PostgreSQL
    this.registerDatabase('primary', {
      type: DatabaseType.POSTGRESQL,
      primary: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'sams_db',
        username: process.env.DB_USER || 'sams_user',
        password: process.env.DB_PASSWORD || 'sams_password',
        ssl: process.env.DB_SSL === 'true',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '20')
      }
    });
  }

  private static async setupAdditionalDatabases(): Promise<void> {
    // Setup additional databases based on environment variables
    // This can be extended to read from configuration files
    
    if (process.env.ENABLE_SHARDED_METRICS === 'true') {
      this.registerDatabase('metrics', {
        type: DatabaseType.POSTGRESQL,
        primary: {
          host: process.env.METRICS_DB_HOST || 'localhost',
          port: parseInt(process.env.METRICS_DB_PORT || '5432'),
          database: process.env.METRICS_DB_NAME || 'sams_metrics',
          username: process.env.METRICS_DB_USER || 'sams_user',
          password: process.env.METRICS_DB_PASSWORD || 'sams_password'
        },
        sharding: {
          enabled: true,
          shardKey: 'server_id',
          replicationFactor: 2,
          shards: {
            'metrics_shard_1': {
              host: process.env.METRICS_SHARD1_HOST || 'localhost',
              port: parseInt(process.env.METRICS_SHARD1_PORT || '5433'),
              database: 'sams_metrics_shard1',
              username: process.env.METRICS_DB_USER || 'sams_user',
              password: process.env.METRICS_DB_PASSWORD || 'sams_password'
            },
            'metrics_shard_2': {
              host: process.env.METRICS_SHARD2_HOST || 'localhost',
              port: parseInt(process.env.METRICS_SHARD2_PORT || '5434'),
              database: 'sams_metrics_shard2',
              username: process.env.METRICS_DB_USER || 'sams_user',
              password: process.env.METRICS_DB_PASSWORD || 'sams_password'
            }
          }
        }
      } as ShardedDatabaseConfig);
    }
  }
}
