import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import { DatabaseFactory } from './database/DatabaseFactory';
import { IDatabaseAdapter, DatabaseType } from './database/interfaces/IDatabaseAdapter';

export class DatabaseService {
  private static instance: Knex | null = null;
  private static adapters: Map<string, IDatabaseAdapter> = new Map();
  private static primaryAdapter: IDatabaseAdapter | null = null;

  public static async initialize(): Promise<void> {
    try {
      // Initialize database factory from environment
      await DatabaseFactory.initializeFromEnvironment();

      // Create primary adapter (PostgreSQL by default)
      this.primaryAdapter = await DatabaseFactory.createAdapterWithFailover('primary');
      this.adapters.set('primary', this.primaryAdapter);

      // Initialize additional databases if configured
      const registeredDbs = DatabaseFactory.getRegisteredDatabases();
      for (const dbName of registeredDbs) {
        if (dbName !== 'primary') {
          try {
            const adapter = await DatabaseFactory.createAdapter(dbName);
            this.adapters.set(dbName, adapter);
            logger.info(`Additional database connected: ${dbName}`);
          } catch (error) {
            logger.warn(`Failed to connect to ${dbName}:`, error);
          }
        }
      }

      // Keep legacy Knex instance for backward compatibility
      const config: Knex.Config = {
        client: 'postgresql',
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'sams_user',
          password: process.env.DB_PASSWORD || 'sams_password',
          database: process.env.DB_NAME || 'sams_db',
        },
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        migrations: {
          directory: './migrations',
          tableName: 'knex_migrations'
        },
        seeds: {
          directory: './seeds'
        }
      };

      this.instance = knex(config);

      // Test connection
      await this.instance.raw('SELECT 1');
      logger.info('Legacy Knex database connection established successfully');

      // Run migrations
      await this.instance.migrate.latest();
      logger.info('Database migrations completed');

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  public static getConnection(): Knex {
    if (!this.instance) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  public static async close(): Promise<void> {
    // Close all adapters
    await DatabaseFactory.closeAllAdapters();
    this.adapters.clear();
    this.primaryAdapter = null;

    // Close legacy Knex instance
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
      logger.info('All database connections closed');
    }
  }

  // Multi-database adapter methods
  public static getAdapter(name: string = 'primary'): IDatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Database adapter not found: ${name}`);
    }
    return adapter;
  }

  public static getPrimaryAdapter(): IDatabaseAdapter {
    if (!this.primaryAdapter) {
      throw new Error('Primary database adapter not initialized');
    }
    return this.primaryAdapter;
  }

  public static getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  public static async healthCheckAll(): Promise<{[name: string]: boolean}> {
    return await DatabaseFactory.healthCheckAll();
  }

  public static async getMetricsAll(): Promise<{[name: string]: any}> {
    return await DatabaseFactory.getMetricsAll();
  }

  // Health check
  public static async healthCheck(): Promise<boolean> {
    try {
      if (!this.instance) return false;
      await this.instance.raw('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Transaction wrapper
  public static async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    const db = this.getConnection();
    return db.transaction(callback);
  }

  // Enhanced query builders for common operations with multi-database support
  public static async findById(table: string, id: string | number, dbName: string = 'primary'): Promise<any> {
    if (dbName === 'primary' && this.instance) {
      // Use legacy Knex for backward compatibility
      const db = this.getConnection();
      return db(table).where('id', id).first();
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.findById(table, id);
  }

  public static async findByField(table: string, field: string, value: any, dbName: string = 'primary'): Promise<any[]> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      return db(table).where(field, value);
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.findByField(table, field, value);
  }

  public static async create(table: string, data: any, dbName: string = 'primary'): Promise<any> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      const [result] = await db(table).insert(data).returning('*');
      return result;
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.insert(table, data);
  }

  public static async update(table: string, id: string | number, data: any, dbName: string = 'primary'): Promise<any> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      const [result] = await db(table).where('id', id).update(data).returning('*');
      return result;
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.update(table, id, data);
  }

  public static async delete(table: string, id: string | number, dbName: string = 'primary'): Promise<boolean> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      const deletedRows = await db(table).where('id', id).del();
      return deletedRows > 0;
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.delete(table, id);
  }

  public static async paginate(
    table: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: any[], total: number, page: number, limit: number, totalPages: number }> {
    const db = this.getConnection();
    const offset = (page - 1) * limit;

    let query = db(table);
    let countQuery = db(table);

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        query = query.where(key, filters[key]);
        countQuery = countQuery.where(key, filters[key]);
      }
    });

    // Get total count
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count as string);

    // Get paginated data
    const data = await query
      .orderBy(orderBy, orderDirection)
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Enhanced bulk operations with multi-database support
  public static async bulkInsert(table: string, data: any[], dbName: string = 'primary'): Promise<any[]> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      return db(table).insert(data).returning('*');
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.bulkInsert(table, data);
  }

  public static async bulkUpdate(table: string, updates: Array<{id: string | number, data: any}>, dbName: string = 'primary'): Promise<any[]> {
    const adapter = this.getAdapter(dbName);
    return await adapter.bulkUpdate(table, updates);
  }

  public static async bulkUpdate(table: string, updates: { id: string | number, data: any }[]): Promise<void> {
    const db = this.getConnection();
    await db.transaction(async (trx) => {
      for (const update of updates) {
        await trx(table).where('id', update.id).update(update.data);
      }
    });
  }

  // Enhanced search functionality with multi-database support
  public static async search(
    table: string,
    searchFields: string[],
    searchTerm: string,
    limit: number = 10,
    dbName: string = 'primary'
  ): Promise<any[]> {
    if (dbName === 'primary' && this.instance) {
      const db = this.getConnection();
      let query = db(table);

      if (searchTerm && searchFields.length > 0) {
        query = query.where(function() {
          searchFields.forEach((field, index) => {
            if (index === 0) {
              this.where(field, 'ILIKE', `%${searchTerm}%`);
            } else {
              this.orWhere(field, 'ILIKE', `%${searchTerm}%`);
            }
          });
        });
      }

      return query.limit(limit);
    }

    const adapter = this.getAdapter(dbName);
    return await adapter.search(table, searchFields, searchTerm, limit);
  }

  // Enhanced pagination with multi-database support
  public static async paginateEnhanced(
    table: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc',
    dbName: string = 'primary'
  ): Promise<{ data: any[], total: number, page: number, limit: number, totalPages: number }> {
    const adapter = this.getAdapter(dbName);
    return await adapter.paginate(table, page, limit, filters, orderBy, orderDirection);
  }

  // Cross-database query execution
  public static async executeQuery<T = any>(sql: string, params?: any[], dbName: string = 'primary'): Promise<T[]> {
    const adapter = this.getAdapter(dbName);
    const result = await adapter.query<T>(sql, params);
    return result.data;
  }

  // Transaction support across databases
  public static async executeTransaction<T>(
    callback: (adapter: IDatabaseAdapter) => Promise<T>,
    dbName: string = 'primary'
  ): Promise<T> {
    const adapter = this.getAdapter(dbName);
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

  // Database-specific operations
  public static async optimizeTable(tableName: string, dbName: string = 'primary'): Promise<void> {
    const adapter = this.getAdapter(dbName);
    await adapter.optimizeTable(tableName);
  }

  public static async explainQuery(sql: string, params?: any[], dbName: string = 'primary'): Promise<any> {
    const adapter = this.getAdapter(dbName);
    return await adapter.explainQuery(sql, params);
  }

  public static async getTableSchema(tableName: string, dbName: string = 'primary'): Promise<any> {
    const adapter = this.getAdapter(dbName);
    return await adapter.getTableSchema(tableName);
  }

  public static async listIndexes(tableName?: string, dbName: string = 'primary'): Promise<any[]> {
    const adapter = this.getAdapter(dbName);
    return await adapter.listIndexes(tableName);
  }

  public static async createIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    unique: boolean = false,
    dbName: string = 'primary'
  ): Promise<void> {
    const adapter = this.getAdapter(dbName);
    await adapter.createIndex(tableName, indexName, columns, unique);
  }

  public static async dropIndex(indexName: string, dbName: string = 'primary'): Promise<void> {
    const adapter = this.getAdapter(dbName);
    await adapter.dropIndex(indexName);
  }

  // Database information
  public static async getDatabaseVersion(dbName: string = 'primary'): Promise<string> {
    const adapter = this.getAdapter(dbName);
    return await adapter.getVersion();
  }

  public static getDatabaseDialect(dbName: string = 'primary'): string {
    const adapter = this.getAdapter(dbName);
    return adapter.getDialect();
  }

  public static async getDatabaseMetrics(dbName: string = 'primary'): Promise<any> {
    const adapter = this.getAdapter(dbName);
    return await adapter.getMetrics();
  }
}
