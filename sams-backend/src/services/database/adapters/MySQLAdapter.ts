/**
 * 🐬 MySQL Database Adapter
 * Implementation of IDatabaseAdapter for MySQL
 */

import mysql from 'mysql2/promise';
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

export class MySQLAdapter implements IDatabaseAdapter {
  private pool: mysql.Pool | null = null;
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
      
      this.pool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionLimit: config.poolSize || 20,
        acquireTimeout: config.timeout || 30000,
        timeout: 30000,
        reconnect: true,
        charset: 'utf8mb4',
        timezone: 'Z'
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();

      logger.info('MySQL connection established successfully');
    } catch (error) {
      logger.error('MySQL connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('MySQL connection closed');
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      return true;
    } catch (error) {
      logger.error('MySQL health check failed:', error);
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const [rows, fields] = await this.pool.execute(sql, params || []);
      const executionTime = Date.now() - startTime;
      
      this.metrics.queryCount++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + executionTime) / this.metrics.queryCount;

      return {
        data: rows as T[],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        fields: fields?.map(f => f.name),
        executionTime
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error.message;
      logger.error('MySQL query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<number> {
    if (!this.pool) throw new Error('Database not connected');
    
    const [result] = await this.pool.execute(sql, params || []);
    return (result as any).affectedRows || 0;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.pool) throw new Error('Database not connected');
    
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: transactionId,
      isActive: true,
      connection,
      commit: async () => {
        await connection.commit();
        connection.release();
      },
      rollback: async () => {
        await connection.rollback();
        connection.release();
      }
    } as TransactionContext & { connection: mysql.PoolConnection };
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
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const [result] = await this.pool!.execute(sql, values);
    
    // Get the inserted record
    const insertId = (result as any).insertId;
    if (insertId) {
      return await this.findById(table, insertId);
    }
    return { ...data, id: insertId };
  }

  async update(table: string, id: string | number, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    await this.pool!.execute(sql, [...values, id]);
    
    return await this.findById(table, id);
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const affectedRows = await this.execute(sql, [id]);
    return affectedRows > 0;
  }

  async findById(table: string, id: string | number): Promise<any> {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await this.query(sql, [id]);
    return result.data[0];
  }

  async findByField(table: string, field: string, value: any): Promise<any[]> {
    const sql = `SELECT * FROM ${table} WHERE ${field} = ?`;
    const result = await this.query(sql, [value]);
    return result.data;
  }

  async bulkInsert(table: string, data: any[]): Promise<any[]> {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    data.forEach(row => {
      const rowPlaceholders = columns.map(() => '?');
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...Object.values(row));
    });
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    await this.pool!.execute(sql, values);
    
    // MySQL doesn't return inserted rows, so we'll return the input data with generated IDs
    return data;
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
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        whereConditions.push(`${key} = ?`);
        whereValues.push(filters[key]);
      }
    });
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const countResult = await this.query(countSql, whereValues);
    const total = countResult.data[0].count;
    
    // Get paginated data
    const dataSql = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;
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
      const result = await this.query(`SELECT * FROM ${table} LIMIT ?`, [limit]);
      return result.data;
    }
    
    const searchConditions = searchFields.map(field => `${field} LIKE ?`).join(' OR ');
    const searchValues = searchFields.map(() => `%${searchTerm}%`);
    
    const sql = `SELECT * FROM ${table} WHERE ${searchConditions} LIMIT ?`;
    const result = await this.query(sql, [...searchValues, limit]);
    return result.data;
  }

  getDialect(): string {
    return 'mysql';
  }

  async getVersion(): Promise<string> {
    const result = await this.query('SELECT VERSION() as version');
    return result.data[0].version;
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    return { ...this.metrics };
  }

  async explainQuery(sql: string, params?: any[]): Promise<any> {
    const explainSql = `EXPLAIN FORMAT=JSON ${sql}`;
    const result = await this.query(explainSql, params);
    return JSON.parse(result.data[0]['EXPLAIN']);
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.execute(`OPTIMIZE TABLE ${tableName}`);
  }

  async createTable(tableName: string, schema: any): Promise<void> {
    throw new Error('createTable not implemented - use migrations instead');
  }

  async dropTable(tableName: string): Promise<void> {
    await this.execute(`DROP TABLE IF EXISTS ${tableName}`);
  }

  async alterTable(tableName: string, alterations: any): Promise<void> {
    throw new Error('alterTable not implemented - use migrations instead');
  }

  async tableExists(tableName: string): Promise<boolean> {
    const sql = `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`;
    const result = await this.query(sql, [tableName]);
    return result.data[0].count > 0;
  }

  async getTableSchema(tableName: string): Promise<any> {
    const sql = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ?
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
    await this.execute(`DROP INDEX ${indexName}`);
  }

  async listIndexes(tableName?: string): Promise<IndexInfo[]> {
    let sql = `
      SELECT
        index_name as name,
        table_name as \`table\`,
        column_name as columns,
        non_unique = 0 as \`unique\`,
        index_type as type
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
    `;

    const params: any[] = [];
    if (tableName) {
      sql += ` AND table_name = ?`;
      params.push(tableName);
    }

    sql += ` ORDER BY table_name, index_name, seq_in_index`;

    const result = await this.query(sql, params);

    // Group columns by index
    const indexMap = new Map<string, IndexInfo>();
    result.data.forEach(row => {
      const key = `${row.table}.${row.name}`;
      if (!indexMap.has(key)) {
        indexMap.set(key, {
          name: row.name,
          table: row.table,
          columns: [row.columns],
          unique: row.unique,
          type: row.type
        });
      } else {
        indexMap.get(key)!.columns.push(row.columns);
      }
    });

    return Array.from(indexMap.values());
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
      appliedAt: new Date(row.appliedAt),
      executionTime: 0
    }));
  }

  async backup(options?: any): Promise<string> {
    throw new Error('Backup functionality requires external mysqldump tool');
  }

  async restore(backupPath: string, options?: any): Promise<void> {
    throw new Error('Restore functionality requires external mysql tool');
  }
}
