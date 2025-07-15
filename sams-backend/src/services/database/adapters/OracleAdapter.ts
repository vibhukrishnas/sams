/**
 * 🏛️ Oracle Database Adapter
 * Implementation of IDatabaseAdapter for Oracle Database
 */

import oracledb from 'oracledb';
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

export class OracleAdapter implements IDatabaseAdapter {
  private pool: oracledb.Pool | null = null;
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
      
      // Initialize Oracle client if needed
      if (!oracledb.initOracleClient) {
        // Oracle Instant Client should be installed
      }
      
      this.pool = await oracledb.createPool({
        user: config.username,
        password: config.password,
        connectString: `${config.host}:${config.port}/${config.database}`,
        poolMin: 2,
        poolMax: config.poolSize || 20,
        poolIncrement: 1,
        poolTimeout: config.timeout || 30,
        stmtCacheSize: 23,
        enableStatistics: true
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();

      logger.info('Oracle connection established successfully');
    } catch (error) {
      logger.error('Oracle connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close(10);
      this.pool = null;
      logger.info('Oracle connection closed');
    }
  }

  isConnected(): boolean {
    return this.pool !== null && !this.pool.status;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();
      return true;
    } catch (error) {
      logger.error('Oracle health check failed:', error);
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const connection = await this.pool.getConnection();
      const result = await connection.execute(sql, params || [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: false
      });
      await connection.close();
      
      const executionTime = Date.now() - startTime;
      
      this.metrics.queryCount++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + executionTime) / this.metrics.queryCount;

      return {
        data: result.rows as T[],
        rowCount: result.rowsAffected || 0,
        fields: result.metaData?.map(col => col.name),
        executionTime
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error.message;
      logger.error('Oracle query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<number> {
    if (!this.pool) throw new Error('Database not connected');
    
    const connection = await this.pool.getConnection();
    const result = await connection.execute(sql, params || [], { autoCommit: true });
    await connection.close();
    
    return result.rowsAffected || 0;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.pool) throw new Error('Database not connected');
    
    const connection = await this.pool.getConnection();
    // Oracle starts transaction automatically
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: transactionId,
      isActive: true,
      connection,
      commit: async () => {
        await connection.commit();
        await connection.close();
      },
      rollback: async () => {
        await connection.rollback();
        await connection.close();
      }
    } as TransactionContext & { connection: oracledb.Connection };
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
    const placeholders = values.map((_, index) => `:${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING * INTO :result`;
    
    if (!this.pool) throw new Error('Database not connected');
    const connection = await this.pool.getConnection();
    
    const result = await connection.execute(sql, [...values, { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }], {
      autoCommit: true
    });
    
    await connection.close();
    
    // Oracle RETURNING clause handling would need more complex implementation
    return { ...data, id: result.lastRowid };
  }

  async update(table: string, id: string | number, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = :${index + 1}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = :${columns.length + 1}`;
    await this.execute(sql, [...values, id]);
    
    return await this.findById(table, id);
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = :1`;
    const affectedRows = await this.execute(sql, [id]);
    return affectedRows > 0;
  }

  async findById(table: string, id: string | number): Promise<any> {
    const sql = `SELECT * FROM ${table} WHERE id = :1`;
    const result = await this.query(sql, [id]);
    return result.data[0];
  }

  async findByField(table: string, field: string, value: any): Promise<any[]> {
    const sql = `SELECT * FROM ${table} WHERE ${field} = :1`;
    const result = await this.query(sql, [value]);
    return result.data;
  }

  async bulkInsert(table: string, data: any[]): Promise<any[]> {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `:${i + 1}`).join(', ')})`;
    
    if (!this.pool) throw new Error('Database not connected');
    const connection = await this.pool.getConnection();
    
    const bindData = data.map(row => Object.values(row));
    await connection.executeMany(sql, bindData, { autoCommit: true });
    await connection.close();
    
    return data; // Oracle doesn't return inserted data easily
  }

  async bulkUpdate(table: string, updates: Array<{id: string | number, data: any}>): Promise<any[]> {
    const results: any[] = [];
    
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
    let paramIndex = 1;
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        whereConditions.push(`${key} = :${paramIndex}`);
        whereValues.push(filters[key]);
        paramIndex++;
      }
    });
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const countResult = await this.query(countSql, whereValues);
    const total = countResult.data[0].COUNT;
    
    // Get paginated data using Oracle ROWNUM
    const dataSql = `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${orderDirection}
        ) a WHERE ROWNUM <= :${paramIndex + 1}
      ) WHERE rnum > :${paramIndex}
    `;
    const dataResult = await this.query(dataSql, [...whereValues, offset + limit, offset]);
    
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
      const result = await this.query(`SELECT * FROM ${table} WHERE ROWNUM <= :1`, [limit]);
      return result.data;
    }
    
    const searchConditions = searchFields.map((field, index) => 
      `UPPER(${field}) LIKE UPPER(:${index + 1})`
    ).join(' OR ');
    
    const searchValues = searchFields.map(() => `%${searchTerm}%`);
    
    const sql = `SELECT * FROM ${table} WHERE (${searchConditions}) AND ROWNUM <= :${searchFields.length + 1}`;
    const result = await this.query(sql, [...searchValues, limit]);
    return result.data;
  }

  getDialect(): string {
    return 'oracle';
  }

  async getVersion(): Promise<string> {
    const result = await this.query('SELECT * FROM v$version WHERE banner LIKE \'Oracle%\'');
    return result.data[0].BANNER;
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    return { ...this.metrics };
  }

  async explainQuery(sql: string, params?: any[]): Promise<any> {
    const explainSql = `EXPLAIN PLAN FOR ${sql}`;
    await this.execute(explainSql, params);
    
    const result = await this.query(`
      SELECT operation, options, object_name, cost, cardinality 
      FROM plan_table 
      ORDER BY id
    `);
    
    return result.data;
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.execute(`ANALYZE TABLE ${tableName} COMPUTE STATISTICS`);
  }

  async createTable(tableName: string, schema: any): Promise<void> {
    throw new Error('createTable not implemented - use migrations instead');
  }

  async dropTable(tableName: string): Promise<void> {
    await this.execute(`DROP TABLE ${tableName}`);
  }

  async alterTable(tableName: string, alterations: any): Promise<void> {
    throw new Error('alterTable not implemented - use migrations instead');
  }

  async tableExists(tableName: string): Promise<boolean> {
    const sql = `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER(:1)`;
    const result = await this.query(sql, [tableName]);
    return result.data[0].COUNT > 0;
  }

  async getTableSchema(tableName: string): Promise<any> {
    const sql = `
      SELECT column_name, data_type, nullable, data_default as column_default
      FROM user_tab_columns
      WHERE table_name = UPPER(:1)
      ORDER BY column_id
    `;
    const result = await this.query(sql, [tableName]);
    return result.data.map(row => ({
      column_name: row.COLUMN_NAME,
      data_type: row.DATA_TYPE,
      is_nullable: row.NULLABLE,
      column_default: row.COLUMN_DEFAULT
    }));
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
        i.index_name as name,
        i.table_name as table_name,
        ic.column_name,
        i.uniqueness,
        i.index_type
      FROM user_indexes i
      JOIN user_ind_columns ic ON i.index_name = ic.index_name
    `;

    const params: any[] = [];
    if (tableName) {
      sql += ` WHERE i.table_name = UPPER(:1)`;
      params.push(tableName);
    }

    sql += ` ORDER BY i.index_name, ic.column_position`;

    const result = await this.query(sql, params);

    // Group columns by index
    const indexMap = new Map<string, IndexInfo>();
    result.data.forEach(row => {
      const key = `${row.TABLE_NAME}.${row.NAME}`;
      if (!indexMap.has(key)) {
        indexMap.set(key, {
          name: row.NAME,
          table: row.TABLE_NAME,
          columns: [row.COLUMN_NAME],
          unique: row.UNIQUENESS === 'UNIQUE',
          type: row.INDEX_TYPE
        });
      } else {
        indexMap.get(key)!.columns.push(row.COLUMN_NAME);
      }
    });

    return Array.from(indexMap.values());
  }

  async runMigration(migration: string): Promise<void> {
    await this.execute(migration);
  }

  async getMigrationHistory(): Promise<MigrationInfo[]> {
    const sql = `
      SELECT name, batch as version, migration_time as applied_at
      FROM knex_migrations
      ORDER BY migration_time DESC
    `;
    const result = await this.query(sql);
    return result.data.map(row => ({
      version: row.VERSION.toString(),
      name: row.NAME,
      appliedAt: new Date(row.APPLIED_AT),
      executionTime: 0
    }));
  }

  async backup(options?: any): Promise<string> {
    throw new Error('Backup functionality requires external Oracle Data Pump (expdp) tool');
  }

  async restore(backupPath: string, options?: any): Promise<void> {
    throw new Error('Restore functionality requires external Oracle Data Pump (impdp) tool');
  }
}
