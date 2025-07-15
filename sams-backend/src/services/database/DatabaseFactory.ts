/**
 * 🏭 Database Factory
 * Creates database adapter instances based on configuration
 */

import { 
  IDatabaseAdapter, 
  DatabaseType, 
  DatabaseConfig, 
  ConnectionConfig 
} from './interfaces/IDatabaseAdapter';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
import { MySQLAdapter } from './adapters/MySQLAdapter';
import { MongoDBAdapter } from './adapters/MongoDBAdapter';
import { OracleAdapter } from './adapters/OracleAdapter';
import { SQLServerAdapter } from './adapters/SQLServerAdapter';
import { logger } from '../../utils/logger';

export class DatabaseFactory {
  private static adapters: Map<string, IDatabaseAdapter> = new Map();
  private static configs: Map<string, DatabaseConfig> = new Map();

  /**
   * Register a database configuration
   */
  static registerDatabase(name: string, config: DatabaseConfig): void {
    this.configs.set(name, config);
    logger.info(`Database configuration registered: ${name} (${config.type})`);
  }

  /**
   * Create and connect to a database adapter
   */
  static async createAdapter(name: string, config?: DatabaseConfig): Promise<IDatabaseAdapter> {
    const dbConfig = config || this.configs.get(name);
    if (!dbConfig) {
      throw new Error(`Database configuration not found: ${name}`);
    }

    // Check if adapter already exists and is connected
    const existingAdapter = this.adapters.get(name);
    if (existingAdapter && existingAdapter.isConnected()) {
      return existingAdapter;
    }

    // Create new adapter based on type
    let adapter: IDatabaseAdapter;
    
    switch (dbConfig.type) {
      case DatabaseType.POSTGRESQL:
        adapter = new PostgreSQLAdapter();
        break;
      case DatabaseType.MYSQL:
        adapter = new MySQLAdapter();
        break;
      case DatabaseType.MONGODB:
        adapter = new MongoDBAdapter();
        break;
      case DatabaseType.ORACLE:
        adapter = new OracleAdapter();
        break;
      case DatabaseType.SQLSERVER:
        adapter = new SQLServerAdapter();
        break;
      default:
        throw new Error(`Unsupported database type: ${dbConfig.type}`);
    }

    // Connect to primary database
    await adapter.connect(dbConfig.primary);
    
    // Store adapter
    this.adapters.set(name, adapter);
    
    logger.info(`Database adapter created and connected: ${name} (${dbConfig.type})`);
    return adapter;
  }

  /**
   * Get existing adapter
   */
  static getAdapter(name: string): IDatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Database adapter not found: ${name}`);
    }
    if (!adapter.isConnected()) {
      throw new Error(`Database adapter not connected: ${name}`);
    }
    return adapter;
  }

  /**
   * Close and remove adapter
   */
  static async closeAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(name);
      logger.info(`Database adapter closed: ${name}`);
    }
  }

  /**
   * Close all adapters
   */
  static async closeAllAdapters(): Promise<void> {
    const closePromises = Array.from(this.adapters.keys()).map(name => 
      this.closeAdapter(name)
    );
    await Promise.all(closePromises);
    logger.info('All database adapters closed');
  }

  /**
   * Get all registered database names
   */
  static getRegisteredDatabases(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get database configuration
   */
  static getConfig(name: string): DatabaseConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Health check for all adapters
   */
  static async healthCheckAll(): Promise<{[name: string]: boolean}> {
    const results: {[name: string]: boolean} = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        logger.error(`Health check failed for ${name}:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * Get metrics for all adapters
   */
  static async getMetricsAll(): Promise<{[name: string]: any}> {
    const results: {[name: string]: any} = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.getMetrics();
      } catch (error) {
        logger.error(`Failed to get metrics for ${name}:`, error);
        results[name] = { error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Create adapter with automatic failover to replicas
   */
  static async createAdapterWithFailover(name: string): Promise<IDatabaseAdapter> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Database configuration not found: ${name}`);
    }

    let adapter: IDatabaseAdapter;
    let lastError: Error | null = null;

    // Try primary first
    try {
      adapter = await this.createAdapter(name, config);
      return adapter;
    } catch (error) {
      lastError = error;
      logger.warn(`Primary database connection failed for ${name}, trying replicas:`, error);
    }

    // Try replicas if available
    if (config.replicas && config.replicas.length > 0) {
      for (let i = 0; i < config.replicas.length; i++) {
        try {
          const replicaConfig: DatabaseConfig = {
            ...config,
            primary: config.replicas[i]
          };
          
          adapter = await this.createAdapter(`${name}_replica_${i}`, replicaConfig);
          logger.info(`Connected to replica ${i} for ${name}`);
          return adapter;
        } catch (error) {
          lastError = error;
          logger.warn(`Replica ${i} connection failed for ${name}:`, error);
        }
      }
    }

    throw lastError || new Error(`All database connections failed for ${name}`);
  }

  /**
   * Initialize databases from environment configuration
   */
  static async initializeFromEnvironment(): Promise<void> {
    // Primary PostgreSQL database
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
      },
      pooling: {
        min: 2,
        max: parseInt(process.env.DB_POOL_SIZE || '20'),
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
      },
      migrations: {
        directory: './migrations',
        tableName: 'knex_migrations'
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000,
        slowQueryThreshold: 1000
      }
    });

    // MySQL database (if configured)
    if (process.env.MYSQL_HOST) {
      this.registerDatabase('mysql', {
        type: DatabaseType.MYSQL,
        primary: {
          host: process.env.MYSQL_HOST,
          port: parseInt(process.env.MYSQL_PORT || '3306'),
          database: process.env.MYSQL_DATABASE || 'sams_mysql',
          username: process.env.MYSQL_USER || 'sams_user',
          password: process.env.MYSQL_PASSWORD || 'sams_password',
          ssl: process.env.MYSQL_SSL === 'true',
          poolSize: parseInt(process.env.MYSQL_POOL_SIZE || '20')
        }
      });
    }

    // MongoDB (if configured)
    if (process.env.MONGODB_HOST) {
      this.registerDatabase('mongodb', {
        type: DatabaseType.MONGODB,
        primary: {
          host: process.env.MONGODB_HOST,
          port: parseInt(process.env.MONGODB_PORT || '27017'),
          database: process.env.MONGODB_DATABASE || 'sams_mongo',
          username: process.env.MONGODB_USER || 'sams_user',
          password: process.env.MONGODB_PASSWORD || 'sams_password',
          ssl: process.env.MONGODB_SSL === 'true',
          poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '20')
        }
      });
    }

    // Oracle (if configured)
    if (process.env.ORACLE_HOST) {
      this.registerDatabase('oracle', {
        type: DatabaseType.ORACLE,
        primary: {
          host: process.env.ORACLE_HOST,
          port: parseInt(process.env.ORACLE_PORT || '1521'),
          database: process.env.ORACLE_SID || 'ORCL',
          username: process.env.ORACLE_USER || 'sams_user',
          password: process.env.ORACLE_PASSWORD || 'sams_password',
          ssl: process.env.ORACLE_SSL === 'true',
          poolSize: parseInt(process.env.ORACLE_POOL_SIZE || '20')
        }
      });
    }

    // SQL Server (if configured)
    if (process.env.SQLSERVER_HOST) {
      this.registerDatabase('sqlserver', {
        type: DatabaseType.SQLSERVER,
        primary: {
          host: process.env.SQLSERVER_HOST,
          port: parseInt(process.env.SQLSERVER_PORT || '1433'),
          database: process.env.SQLSERVER_DATABASE || 'sams_sqlserver',
          username: process.env.SQLSERVER_USER || 'sams_user',
          password: process.env.SQLSERVER_PASSWORD || 'sams_password',
          ssl: process.env.SQLSERVER_SSL === 'true',
          poolSize: parseInt(process.env.SQLSERVER_POOL_SIZE || '20')
        }
      });
    }

    logger.info('Database factory initialized from environment');
  }
}
