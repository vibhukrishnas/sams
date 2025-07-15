/**
 * 🏢 SQL Server Database Adapter
 * Implementation of IDatabaseAdapter for Microsoft SQL Server
 */

import sql from 'mssql';
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

export class SQLServerAdapter implements IDatabaseAdapter {
  private pool: sql.ConnectionPool | null = null;
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
      
      const sqlConfig: sql.config = {
        server: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        pool: {
          max: config.poolSize || 20,
          min: 2,
          idleTimeoutMillis: config.timeout || 30000,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100
        },
        options: {
          encrypt: config.ssl || false,
          trustServerCertificate: true,
          enableArithAbort: true
        },
        requestTimeout: 30000,
        connectionTimeout: 30000
      };

      this.pool = new sql.ConnectionPool(sqlConfig);
      
      // Setup event listeners
      this.pool.on('connect', () => {
        this.metrics.activeConnections++;
        this.metrics.totalConnections++;
      });

      this.pool.on('close', () => {
        this.metrics.activeConnections--;
      });

      this.pool.on('error', (err) => {
        this.metrics.errorCount++;
        this.metrics.lastError = err.message;
        logger.error('SQL Server pool error:', err);
      });

      await this.pool.connect();

      // Test connection
      await this.pool.request().query('SELECT 1');

      logger.info('SQL Server connection established successfully');
    } catch (error) {
      logger.error('SQL Server connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      logger.info('SQL Server connection closed');
    }
  }

  isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool || !this.pool.connected) return false;
      await this.pool.request().query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('SQL Server health check failed:', error);
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    try {
      if (!this.pool) throw new Error('Database not connected');
      
      const request = this.pool.request();
      
      // Add parameters if provided
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
        // Replace ? placeholders with @param0, @param1, etc.
        let paramIndex = 0;
        sql = sql.replace(/\?/g, () => `@param${paramIndex++}`);
      }
      
      const result = await request.query(sql);
      const executionTime = Date.now() - startTime;
      
      this.metrics.queryCount++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + executionTime) / this.metrics.queryCount;

      return {
        data: result.recordset as T[],
        rowCount: result.rowsAffected[0] || 0,
        fields: result.recordset.columns ? Object.keys(result.recordset.columns) : undefined,
        executionTime
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error.message;
      logger.error('SQL Server query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.pool) throw new Error('Database not connected');
    
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: transactionId,
      isActive: true,
      transaction,
      commit: async () => {
        await transaction.commit();
      },
      rollback: async () => {
        await transaction.rollback();
      }
    } as TransactionContext & { transaction: sql.Transaction };
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
    const placeholders = values.map((_, index) => `@param${index}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) OUTPUT INSERTED.* VALUES (${placeholders})`;
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    
    values.forEach((value, index) => {
      request.input(`param${index}`, value);
    });
    
    const result = await request.query(sql);
    return result.recordset[0];
  }

  async update(table: string, id: string | number, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = @param${index}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} OUTPUT INSERTED.* WHERE id = @paramId`;
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    
    values.forEach((value, index) => {
      request.input(`param${index}`, value);
    });
    request.input('paramId', id);
    
    const result = await request.query(sql);
    return result.recordset[0];
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE id = @paramId`;
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    request.input('paramId', id);
    
    const result = await request.query(sql);
    return result.rowsAffected[0] > 0;
  }

  async findById(table: string, id: string | number): Promise<any> {
    const sql = `SELECT * FROM ${table} WHERE id = @paramId`;
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    request.input('paramId', id);
    
    const result = await request.query(sql);
    return result.recordset[0];
  }

  async findByField(table: string, field: string, value: any): Promise<any[]> {
    const sql = `SELECT * FROM ${table} WHERE ${field} = @paramValue`;
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    request.input('paramValue', value);
    
    const result = await request.query(sql);
    return result.recordset;
  }

  async bulkInsert(table: string, data: any[]): Promise<any[]> {
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    const sqlTable = new sql.Table(table);
    
    // Define table structure
    columns.forEach(column => {
      sqlTable.columns.add(column, sql.NVarChar, { nullable: true });
    });
    
    // Add rows
    data.forEach(row => {
      sqlTable.rows.add(...Object.values(row));
    });
    
    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    await request.bulk(sqlTable);
    
    return data; // SQL Server bulk insert doesn't return inserted data
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
    let paramIndex = 0;
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        whereConditions.push(`${key} = @param${paramIndex}`);
        whereValues.push(filters[key]);
        paramIndex++;
      }
    });
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    if (!this.pool) throw new Error('Database not connected');
    
    // Get total count
    const countRequest = this.pool.request();
    whereValues.forEach((value, index) => {
      countRequest.input(`param${index}`, value);
    });
    
    const countSql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const countResult = await countRequest.query(countSql);
    const total = countResult.recordset[0].count;
    
    // Get paginated data
    const dataRequest = this.pool.request();
    whereValues.forEach((value, index) => {
      dataRequest.input(`param${index}`, value);
    });
    dataRequest.input('offset', offset);
    dataRequest.input('limit', limit);
    
    const dataSql = `
      SELECT * FROM ${table} ${whereClause} 
      ORDER BY ${orderBy} ${orderDirection} 
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const dataResult = await dataRequest.query(dataSql);
    
    return {
      data: dataResult.recordset,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  getDialect(): string {
    return 'mssql';
  }

  async getVersion(): Promise<string> {
    const result = await this.query('SELECT @@VERSION as version');
    return result.data[0].version;
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    return { ...this.metrics };
  }

  async search(table: string, searchFields: string[], searchTerm: string, limit: number = 10): Promise<any[]> {
    if (!searchTerm || searchFields.length === 0) {
      const result = await this.query(`SELECT TOP (@limit) * FROM ${table}`, [limit]);
      return result.data;
    }

    const searchConditions = searchFields.map((field, index) =>
      `${field} LIKE @param${index}`
    ).join(' OR ');

    const searchValues = searchFields.map(() => `%${searchTerm}%`);

    const sql = `SELECT TOP (@limit) * FROM ${table} WHERE ${searchConditions}`;
    const result = await this.query(sql, [...searchValues, limit]);
    return result.data;
  }

  async explainQuery(sql: string, params?: any[]): Promise<any> {
    const explainSql = `SET SHOWPLAN_ALL ON; ${sql}; SET SHOWPLAN_ALL OFF`;
    const result = await this.query(explainSql, params);
    return result.data;
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.execute(`UPDATE STATISTICS ${tableName}`);
    await this.execute(`DBCC DBREINDEX('${tableName}')`);
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
    const sql = `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName`;

    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    request.input('tableName', tableName);

    const result = await request.query(sql);
    return result.recordset[0].count > 0;
  }

  async getTableSchema(tableName: string): Promise<any> {
    const sql = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `;

    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    request.input('tableName', tableName);

    const result = await request.query(sql);
    return result.recordset;
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
        i.name as index_name,
        t.name as table_name,
        c.name as column_name,
        i.is_unique,
        i.type_desc
      FROM sys.indexes i
      JOIN sys.tables t ON i.object_id = t.object_id
      JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    `;

    const params: any[] = [];
    if (tableName) {
      sql += ` WHERE t.name = @tableName`;
      params.push(tableName);
    }

    sql += ` ORDER BY i.name, ic.key_ordinal`;

    if (!this.pool) throw new Error('Database not connected');
    const request = this.pool.request();
    if (tableName) {
      request.input('tableName', tableName);
    }

    const result = await request.query(sql);

    // Group columns by index
    const indexMap = new Map<string, IndexInfo>();
    result.recordset.forEach(row => {
      const key = `${row.table_name}.${row.index_name}`;
      if (!indexMap.has(key)) {
        indexMap.set(key, {
          name: row.index_name,
          table: row.table_name,
          columns: [row.column_name],
          unique: row.is_unique,
          type: row.type_desc
        });
      } else {
        indexMap.get(key)!.columns.push(row.column_name);
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
      version: row.version.toString(),
      name: row.name,
      appliedAt: new Date(row.applied_at),
      executionTime: 0
    }));
  }

  async backup(options?: any): Promise<string> {
    throw new Error('Backup functionality requires SQL Server backup commands or external tools');
  }

  async restore(backupPath: string, options?: any): Promise<void> {
    throw new Error('Restore functionality requires SQL Server restore commands or external tools');
  }
}
