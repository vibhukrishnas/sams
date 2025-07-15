/**
 * 🗄️ Database Adapter Interface
 * Unified interface for all database types in SAMS
 */

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
  retryAttempts?: number;
  [key: string]: any;
}

export interface QueryResult<T = any> {
  data: T[];
  rowCount: number;
  fields?: string[];
  executionTime?: number;
}

export interface TransactionContext {
  id: string;
  isActive: boolean;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseMetrics {
  activeConnections: number;
  totalConnections: number;
  queryCount: number;
  averageQueryTime: number;
  errorCount: number;
  lastError?: string;
}

export interface MigrationInfo {
  version: string;
  name: string;
  appliedAt: Date;
  executionTime: number;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface IDatabaseAdapter {
  // Connection Management
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  
  // Query Operations
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<number>;
  
  // Transaction Management
  beginTransaction(): Promise<TransactionContext>;
  commitTransaction(context: TransactionContext): Promise<void>;
  rollbackTransaction(context: TransactionContext): Promise<void>;
  
  // CRUD Operations
  insert(table: string, data: any): Promise<any>;
  update(table: string, id: string | number, data: any): Promise<any>;
  delete(table: string, id: string | number): Promise<boolean>;
  findById(table: string, id: string | number): Promise<any>;
  findByField(table: string, field: string, value: any): Promise<any[]>;
  
  // Advanced Operations
  bulkInsert(table: string, data: any[]): Promise<any[]>;
  bulkUpdate(table: string, updates: Array<{id: string | number, data: any}>): Promise<any[]>;
  paginate(table: string, page: number, limit: number, filters?: any, orderBy?: string, orderDirection?: 'asc' | 'desc'): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  search(table: string, searchFields: string[], searchTerm: string, limit?: number): Promise<any[]>;
  
  // Schema Management
  createTable(tableName: string, schema: any): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  alterTable(tableName: string, alterations: any): Promise<void>;
  tableExists(tableName: string): Promise<boolean>;
  getTableSchema(tableName: string): Promise<any>;
  
  // Index Management
  createIndex(tableName: string, indexName: string, columns: string[], unique?: boolean): Promise<void>;
  dropIndex(indexName: string): Promise<void>;
  listIndexes(tableName?: string): Promise<IndexInfo[]>;
  
  // Migration Support
  runMigration(migration: string): Promise<void>;
  getMigrationHistory(): Promise<MigrationInfo[]>;
  
  // Performance & Monitoring
  getMetrics(): Promise<DatabaseMetrics>;
  explainQuery(sql: string, params?: any[]): Promise<any>;
  optimizeTable(tableName: string): Promise<void>;
  
  // Database-specific features
  getDialect(): string;
  getVersion(): Promise<string>;
  backup(options?: any): Promise<string>;
  restore(backupPath: string, options?: any): Promise<void>;
}

export interface IShardManager {
  // Shard Management
  addShard(shardId: string, config: ConnectionConfig): Promise<void>;
  removeShard(shardId: string): Promise<void>;
  getShardForKey(key: string): string;
  rebalanceShards(): Promise<void>;
  
  // Data Distribution
  distributeData(table: string, data: any): Promise<void>;
  queryAllShards<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  queryShardByKey<T>(key: string, sql: string, params?: any[]): Promise<QueryResult<T>>;
  
  // Shard Health
  getShardHealth(): Promise<{[shardId: string]: boolean}>;
  getShardMetrics(): Promise<{[shardId: string]: DatabaseMetrics}>;
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  ORACLE = 'oracle',
  SQLSERVER = 'sqlserver',
  MONGODB = 'mongodb'
}

export interface DatabaseConfig {
  type: DatabaseType;
  primary: ConnectionConfig;
  replicas?: ConnectionConfig[];
  sharding?: {
    enabled: boolean;
    shardKey: string;
    shards: {[shardId: string]: ConnectionConfig};
  };
  pooling?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  migrations?: {
    directory: string;
    tableName: string;
  };
  monitoring?: {
    enabled: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
  };
}
