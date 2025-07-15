/**
 * 🐘 PostgreSQL Database Adapter
 * Implementation of IDatabaseAdapter for PostgreSQL
 */

import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import { 
  IDatabaseAdapter, 
  ConnectionConfig, 
  QueryResult, 
  TransactionContext, 
  DatabaseMetrics,
  MigrationInfo,
  IndexInfo
} from '../interfaces/IDatabaseAdapter';
import { logger } from '../../../utils/logger';

export class PostgreSQLAdapter implements IDatabaseAdapter {
  private pool: Pool | null = null;
  private config: ConnectionConfig | null = null;
  private metrics: DatabaseMetrics = {
    activeConnections: 0,
    totalConnections: 0,
    queryCount: 0,
    averageQueryTime: 0,
    errorCount: 0
  };

  async connect(config: ConnectionConfig): Promise<void> {
    try {
      this.config = config;
      
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        max: config.poolSize || 20,
        min: 2,
        idleTimeoutMillis: config.timeout || 30000,
        connectionTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Setup event listeners
      this.pool.on('connect', () => {
        this.metrics.activeConnections++;
        this.metrics.totalConnections++;
      });

      this.pool.on('remove', () => {
        this.metrics.activeConnections--;
      });

      this.pool.on('error', (err) => {
        this.metrics.errorCount++;
        this.metrics.lastError = err.message;
        logger.error('PostgreSQL pool error:', err);
      });

      logger.info('PostgreSQL connection established successfully');
    } catch (error) {
      logger.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('PostgreSQL connection closed');
    }
  }

  isConnected(): boolean {
    return this.pool !== null && !this.pool.ended;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const result: PgQueryResult = await this.pool.query(sql, params);
      const executionTime = Date.now() - startTime;
      
      this.metrics.queryCount++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + executionTime) / this.metrics.queryCount;

      return {
        data: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields?.map(f => f.name),
        executionTime
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error.message;
      logger.error('PostgreSQL query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.pool) throw new Error('Database not connected');
    
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: transactionId,
      isActive: true,
      client,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      }
    } as TransactionContext & { client: PoolClient };
  }

  async commitTransaction(context: TransactionContext): Promise<void> {
    await context.commit();
  }

  async rollbackTransaction(context: TransactionContext): Promise<void> {
    await context.rollback();
  }

  async insert(table: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(sql, values);
    return result.data[0];
  }

  async update(table: string, id: string | number, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
    const result = await this.query(sql, [...values, id]);
    return result.data[0];
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.execute(sql, [id]);
    return result > 0;
  }

  async findById(table: string, id: string | number): Promise<any> {
    const sql = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await this.query(sql, [id]);
    return result.data[0];
  }

  async findByField(table: string, field: string, value: any): Promise<any[]> {
    const sql = `SELECT * FROM ${table} WHERE ${field} = $1`;
    const result = await this.query(sql, [value]);
    return result.data;
  }

  async bulkInsert(table: string, data: any[]): Promise<any[]> {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    data.forEach((row, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => 
        `$${rowIndex * columns.length + colIndex + 1}`
      );
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...Object.values(row));
    });
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`;
    const result = await this.query(sql, values);
    return result.data;
  }

  async bulkUpdate(table: string, updates: Array<{id: string | number, data: any}>): Promise<any[]> {
    const results: any[] = [];
    
    // Use transaction for bulk updates
    const transaction = await this.beginTransaction();
    try {
      for (const update of updates) {
        const result = await this.update(table, update.id, update.data);
        results.push(result);
      }
      await this.commitTransaction(transaction);
    } catch (error) {
      await this.rollbackTransaction(transaction);
      throw error;
    }
    
    return results;
  }

  getDialect(): string {
    return 'postgresql';
  }

  async getVersion(): Promise<string> {
    const result = await this.query('SELECT version()');
    return result.data[0].version;
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    return { ...this.metrics };
  }

  async explainQuery(sql: string, params?: any[]): Promise<any> {
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await this.query(explainSql, params);
    return result.data[0]['QUERY PLAN'];
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.execute(`VACUUM ANALYZE ${tableName}`);
  }

  async backup(options?: any): Promise<string> {
    // This would typically use pg_dump
    throw new Error('Backup functionality requires external pg_dump tool');
  }

  async restore(backupPath: string, options?: any): Promise<void> {
    // This would typically use pg_restore
    throw new Error('Restore functionality requires external pg_restore tool');
  }

  async paginate(
    table: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {},
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{data: any[], total: number, page: number, limit: number, totalPages: number}> {
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereValues: any[] = [];
    let paramIndex = 1;

    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        whereConditions.push(`${key} = $${paramIndex}`);
        whereValues.push(filters[key]);
        paramIndex++;
      }
    });

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const countResult = await this.query(countSql, whereValues);
    const total = parseInt(countResult.data[0].count);

    // Get paginated data
    const dataSql = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataResult = await this.query(dataSql, [...whereValues, limit, offset]);

    return {
      data: dataResult.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async search(table: string, searchFields: string[], searchTerm: string, limit: number = 10): Promise<any[]> {
    if (!searchTerm || searchFields.length === 0) {
      const result = await this.query(`SELECT * FROM ${table} LIMIT $1`, [limit]);
      return result.data;
    }

    const searchConditions = searchFields.map((field, index) =>
      `${field} ILIKE $${index + 1}`
    ).join(' OR ');

    const searchValues = searchFields.map(() => `%${searchTerm}%`);

    const sql = `SELECT * FROM ${table} WHERE ${searchConditions} LIMIT $${searchFields.length + 1}`;
    const result = await this.query(sql, [...searchValues, limit]);
    return result.data;
  }

  async createTable(tableName: string, schema: any): Promise<void> {
    // This would need to be implemented based on schema format
    throw new Error('createTable not implemented - use migrations instead');
  }

  async dropTable(tableName: string): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
  }

  async alterTable(tableName: string, alterations: any): Promise<void> {
    // This would need to be implemented based on alterations format
    throw new Error('alterTable not implemented - use migrations instead');
  }

  async tableExists(tableName: string): Promise<boolean> {
    const sql = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`;
    const result = await this.query(sql, [tableName]);
    return result.data[0].exists;
  }

  async getTableSchema(tableName: string): Promise<any> {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await this.query(sql, [tableName]);
    return result.data;
  }

  async createIndex(tableName: string, indexName: string, columns: string[], unique: boolean = false): Promise<void> {
    const uniqueClause = unique ? 'UNIQUE' : '';
    const sql = `CREATE ${uniqueClause} INDEX ${indexName} ON ${tableName} (${columns.join(', ')})`;
    await this.execute(sql);
  }

  async dropIndex(indexName: string): Promise<void> {
    await this.execute(`DROP INDEX IF EXISTS ${indexName}`);
  }

  async listIndexes(tableName?: string): Promise<IndexInfo[]> {
    let sql = `
      SELECT
        i.relname as name,
        t.relname as table,
        array_agg(a.attname ORDER BY c.ordinality) as columns,
        ix.indisunique as unique,
        am.amname as type
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN unnest(ix.indkey) WITH ORDINALITY AS c(attnum, ordinality) ON true
      JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = c.attnum
    `;

    const params: any[] = [];
    if (tableName) {
      sql += ` WHERE t.relname = $1`;
      params.push(tableName);
    }

    sql += ` GROUP BY i.relname, t.relname, ix.indisunique, am.amname`;

    const result = await this.query(sql, params);
    return result.data.map(row => ({
      name: row.name,
      table: row.table,
      columns: row.columns,
      unique: row.unique,
      type: row.type
    }));
  }

  async runMigration(migration: string): Promise<void> {
    await this.execute(migration);
  }

  async getMigrationHistory(): Promise<MigrationInfo[]> {
    const sql = `
      SELECT name, batch as version, migration_time as appliedAt
      FROM knex_migrations
      ORDER BY migration_time DESC
    `;
    const result = await this.query(sql);
    return result.data.map(row => ({
      version: row.version.toString(),
      name: row.name,
      appliedAt: new Date(row.appliedat),
      executionTime: 0 // Not tracked in basic implementation
    }));
  }
}
