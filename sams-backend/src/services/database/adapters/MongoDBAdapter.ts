/**
 * 🍃 MongoDB Database Adapter
 * Implementation of IDatabaseAdapter for MongoDB
 */

import { MongoClient, Db, Collection, ClientSession } from 'mongodb';
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

export class MongoDBAdapter implements IDatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
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
      
      const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      
      this.client = new MongoClient(uri, {
        maxPoolSize: config.poolSize || 20,
        minPoolSize: 2,
        maxIdleTimeMS: config.timeout || 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        ssl: config.ssl || false
      });

      await this.client.connect();
      this.db = this.client.db(config.database);

      // Test connection
      await this.db.admin().ping();

      logger.info('MongoDB connection established successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('MongoDB connection closed');
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    // MongoDB doesn't use SQL, so we'll interpret this as a collection operation
    // This is a simplified implementation - in practice, you'd need a query parser
    const startTime = Date.now();
    try {
      if (!this.db) throw new Error('Database not connected');
      
      // Parse the "SQL" to extract collection and operation
      // This is a very basic implementation
      const match = sql.match(/FROM\s+(\w+)/i);
      if (!match) throw new Error('Invalid query format for MongoDB');
      
      const collectionName = match[1];
      const collection = this.db.collection(collectionName);
      
      let result: any[];
      if (sql.toLowerCase().includes('select')) {
        result = await collection.find({}).toArray();
      } else {
        throw new Error('Unsupported query type for MongoDB');
      }
      
      const executionTime = Date.now() - startTime;
      
      this.metrics.queryCount++;
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + executionTime) / this.metrics.queryCount;

      return {
        data: result as T[],
        rowCount: result.length,
        executionTime
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error.message;
      logger.error('MongoDB query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount;
  }

  async beginTransaction(): Promise<TransactionContext> {
    if (!this.client) throw new Error('Database not connected');
    
    const session = this.client.startSession();
    session.startTransaction();
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: transactionId,
      isActive: true,
      session,
      commit: async () => {
        await session.commitTransaction();
        await session.endSession();
      },
      rollback: async () => {
        await session.abortTransaction();
        await session.endSession();
      }
    } as TransactionContext & { session: ClientSession };
  }

  async commitTransaction(context: TransactionContext): Promise<void> {
    await context.commit();
  }

  async rollbackTransaction(context: TransactionContext): Promise<void> {
    await context.rollback();
  }

  async insert(table: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    const result = await collection.insertOne(data);
    
    return { ...data, _id: result.insertedId };
  }

  async update(table: string, id: string | number, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    const filter = typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id } 
      : { id: id };
    
    const result = await collection.findOneAndUpdate(
      filter,
      { $set: data },
      { returnDocument: 'after' }
    );
    
    return result.value;
  }

  async delete(table: string, id: string | number): Promise<boolean> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    const filter = typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id } 
      : { id: id };
    
    const result = await collection.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async findById(table: string, id: string | number): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    const filter = typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id } 
      : { id: id };
    
    return await collection.findOne(filter);
  }

  async findByField(table: string, field: string, value: any): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    return await collection.find({ [field]: value }).toArray();
  }

  async bulkInsert(table: string, data: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    if (data.length === 0) return [];
    
    const collection = this.db.collection(table);
    const result = await collection.insertMany(data);
    
    return data.map((item, index) => ({
      ...item,
      _id: result.insertedIds[index]
    }));
  }

  async bulkUpdate(table: string, updates: Array<{id: string | number, data: any}>): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
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
    orderBy: string = 'createdAt', 
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{data: any[], total: number, page: number, limit: number, totalPages: number}> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = Object.keys(filters).reduce((acc, key) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        acc[key] = filters[key];
      }
      return acc;
    }, {} as any);
    
    // Get total count
    const total = await collection.countDocuments(filter);
    
    // Get paginated data
    const sortOrder = orderDirection === 'desc' ? -1 : 1;
    const data = await collection
      .find(filter)
      .sort({ [orderBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async search(table: string, searchFields: string[], searchTerm: string, limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');
    
    const collection = this.db.collection(table);
    
    if (!searchTerm || searchFields.length === 0) {
      return await collection.find({}).limit(limit).toArray();
    }
    
    // Create text search query
    const searchConditions = searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }));
    
    return await collection
      .find({ $or: searchConditions })
      .limit(limit)
      .toArray();
  }

  getDialect(): string {
    return 'mongodb';
  }

  async getVersion(): Promise<string> {
    if (!this.db) throw new Error('Database not connected');
    const result = await this.db.admin().serverStatus();
    return result.version;
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    return { ...this.metrics };
  }

  async explainQuery(sql: string, params?: any[]): Promise<any> {
    // MongoDB explain would need to be implemented differently
    throw new Error('Explain query not implemented for MongoDB');
  }

  async optimizeTable(tableName: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    // MongoDB doesn't have table optimization like SQL databases
    // We could implement index optimization or compaction here
    const collection = this.db.collection(tableName);
    await collection.reIndex();
  }

  async createTable(tableName: string, schema: any): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    // MongoDB creates collections automatically, but we can create it explicitly
    await this.db.createCollection(tableName);
  }

  async dropTable(tableName: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection(tableName).drop();
  }

  async alterTable(tableName: string, alterations: any): Promise<void> {
    // MongoDB is schemaless, so table alterations don't apply
    throw new Error('Table alterations not applicable to MongoDB');
  }

  async tableExists(tableName: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not connected');
    const collections = await this.db.listCollections({ name: tableName }).toArray();
    return collections.length > 0;
  }

  async getTableSchema(tableName: string): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    // MongoDB is schemaless, but we can analyze a sample document
    const collection = this.db.collection(tableName);
    const sample = await collection.findOne({});

    if (!sample) return {};

    return Object.keys(sample).map(key => ({
      column_name: key,
      data_type: typeof sample[key],
      is_nullable: 'YES', // MongoDB fields are always nullable
      column_default: null
    }));
  }

  async createIndex(tableName: string, indexName: string, columns: string[], unique: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const collection = this.db.collection(tableName);
    const indexSpec = columns.reduce((acc, col) => {
      acc[col] = 1; // 1 for ascending, -1 for descending
      return acc;
    }, {} as any);

    await collection.createIndex(indexSpec, {
      name: indexName,
      unique: unique
    });
  }

  async dropIndex(indexName: string): Promise<void> {
    // MongoDB requires collection name to drop index
    throw new Error('dropIndex requires collection name for MongoDB');
  }

  async listIndexes(tableName?: string): Promise<IndexInfo[]> {
    if (!this.db) throw new Error('Database not connected');
    if (!tableName) throw new Error('Table name required for MongoDB index listing');

    const collection = this.db.collection(tableName);
    const indexes = await collection.listIndexes().toArray();

    return indexes.map(index => ({
      name: index.name,
      table: tableName,
      columns: Object.keys(index.key),
      unique: index.unique || false,
      type: 'btree' // MongoDB uses B-tree indexes by default
    }));
  }

  async runMigration(migration: string): Promise<void> {
    // MongoDB migrations would be JavaScript code, not SQL
    throw new Error('MongoDB migrations should be JavaScript functions, not SQL strings');
  }

  async getMigrationHistory(): Promise<MigrationInfo[]> {
    if (!this.db) throw new Error('Database not connected');

    const collection = this.db.collection('migrations');
    const migrations = await collection.find({}).sort({ appliedAt: -1 }).toArray();

    return migrations.map(migration => ({
      version: migration.version,
      name: migration.name,
      appliedAt: migration.appliedAt,
      executionTime: migration.executionTime || 0
    }));
  }

  async backup(options?: any): Promise<string> {
    throw new Error('Backup functionality requires external mongodump tool');
  }

  async restore(backupPath: string, options?: any): Promise<void> {
    throw new Error('Restore functionality requires external mongorestore tool');
  }
}
