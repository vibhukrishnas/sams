import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: Knex | null = null;

  public static async initialize(): Promise<void> {
    try {
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
      logger.info('Database connection established successfully');

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
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
      logger.info('Database connection closed');
    }
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

  // Query builders for common operations
  public static async findById(table: string, id: string | number): Promise<any> {
    const db = this.getConnection();
    return db(table).where('id', id).first();
  }

  public static async findByField(table: string, field: string, value: any): Promise<any[]> {
    const db = this.getConnection();
    return db(table).where(field, value);
  }

  public static async create(table: string, data: any): Promise<any> {
    const db = this.getConnection();
    const [result] = await db(table).insert(data).returning('*');
    return result;
  }

  public static async update(table: string, id: string | number, data: any): Promise<any> {
    const db = this.getConnection();
    const [result] = await db(table).where('id', id).update(data).returning('*');
    return result;
  }

  public static async delete(table: string, id: string | number): Promise<boolean> {
    const db = this.getConnection();
    const deletedRows = await db(table).where('id', id).del();
    return deletedRows > 0;
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

  // Bulk operations
  public static async bulkInsert(table: string, data: any[]): Promise<any[]> {
    const db = this.getConnection();
    return db(table).insert(data).returning('*');
  }

  public static async bulkUpdate(table: string, updates: { id: string | number, data: any }[]): Promise<void> {
    const db = this.getConnection();
    await db.transaction(async (trx) => {
      for (const update of updates) {
        await trx(table).where('id', update.id).update(update.data);
      }
    });
  }

  // Search functionality
  public static async search(
    table: string,
    searchFields: string[],
    searchTerm: string,
    limit: number = 10
  ): Promise<any[]> {
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
}
