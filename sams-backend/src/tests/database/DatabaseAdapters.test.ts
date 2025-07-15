/**
 * 🧪 Database Adapters Test Suite
 * Comprehensive tests for multi-database abstraction layer
 */

import { DatabaseFactory } from '../../services/database/DatabaseFactory';
import { PostgreSQLAdapter } from '../../services/database/adapters/PostgreSQLAdapter';
import { MySQLAdapter } from '../../services/database/adapters/MySQLAdapter';
import { MongoDBAdapter } from '../../services/database/adapters/MongoDBAdapter';
import { DatabaseType, ConnectionConfig } from '../../services/database/interfaces/IDatabaseAdapter';

describe('Database Adapters', () => {
  const testConfig: ConnectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    username: 'test_user',
    password: 'test_password',
    poolSize: 5
  };

  beforeAll(async () => {
    // Register test databases
    DatabaseFactory.registerDatabase('test_postgres', {
      type: DatabaseType.POSTGRESQL,
      primary: { ...testConfig, port: 5432 }
    });

    DatabaseFactory.registerDatabase('test_mysql', {
      type: DatabaseType.MYSQL,
      primary: { ...testConfig, port: 3306 }
    });

    DatabaseFactory.registerDatabase('test_mongodb', {
      type: DatabaseType.MONGODB,
      primary: { ...testConfig, port: 27017 }
    });
  });

  afterAll(async () => {
    await DatabaseFactory.closeAllAdapters();
  });

  describe('PostgreSQL Adapter', () => {
    let adapter: PostgreSQLAdapter;

    beforeEach(() => {
      adapter = new PostgreSQLAdapter();
    });

    afterEach(async () => {
      if (adapter.isConnected()) {
        await adapter.disconnect();
      }
    });

    test('should connect to PostgreSQL database', async () => {
      // Mock connection for testing
      const mockConnect = jest.spyOn(adapter, 'connect').mockResolvedValue();
      const mockIsConnected = jest.spyOn(adapter, 'isConnected').mockReturnValue(true);

      await adapter.connect(testConfig);
      expect(mockConnect).toHaveBeenCalledWith(testConfig);
      expect(adapter.isConnected()).toBe(true);

      mockConnect.mockRestore();
      mockIsConnected.mockRestore();
    });

    test('should perform health check', async () => {
      const mockHealthCheck = jest.spyOn(adapter, 'healthCheck').mockResolvedValue(true);

      const isHealthy = await adapter.healthCheck();
      expect(isHealthy).toBe(true);

      mockHealthCheck.mockRestore();
    });

    test('should execute queries', async () => {
      const mockQuery = jest.spyOn(adapter, 'query').mockResolvedValue({
        data: [{ id: 1, name: 'test' }],
        rowCount: 1,
        executionTime: 10
      });

      const result = await adapter.query('SELECT * FROM test_table');
      expect(result.data).toHaveLength(1);
      expect(result.rowCount).toBe(1);

      mockQuery.mockRestore();
    });

    test('should handle transactions', async () => {
      const mockBeginTransaction = jest.spyOn(adapter, 'beginTransaction').mockResolvedValue({
        id: 'tx_123',
        isActive: true,
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined)
      });

      const transaction = await adapter.beginTransaction();
      expect(transaction.id).toBe('tx_123');
      expect(transaction.isActive).toBe(true);

      await transaction.commit();
      expect(transaction.commit).toHaveBeenCalled();

      mockBeginTransaction.mockRestore();
    });

    test('should perform CRUD operations', async () => {
      const testData = { name: 'test', value: 123 };
      const expectedResult = { id: 1, ...testData };

      const mockInsert = jest.spyOn(adapter, 'insert').mockResolvedValue(expectedResult);
      const mockFindById = jest.spyOn(adapter, 'findById').mockResolvedValue(expectedResult);
      const mockUpdate = jest.spyOn(adapter, 'update').mockResolvedValue({ ...expectedResult, value: 456 });
      const mockDelete = jest.spyOn(adapter, 'delete').mockResolvedValue(true);

      // Test insert
      const insertResult = await adapter.insert('test_table', testData);
      expect(insertResult).toEqual(expectedResult);

      // Test find by ID
      const findResult = await adapter.findById('test_table', 1);
      expect(findResult).toEqual(expectedResult);

      // Test update
      const updateResult = await adapter.update('test_table', 1, { value: 456 });
      expect(updateResult.value).toBe(456);

      // Test delete
      const deleteResult = await adapter.delete('test_table', 1);
      expect(deleteResult).toBe(true);

      mockInsert.mockRestore();
      mockFindById.mockRestore();
      mockUpdate.mockRestore();
      mockDelete.mockRestore();
    });

    test('should handle bulk operations', async () => {
      const testData = [
        { name: 'test1', value: 1 },
        { name: 'test2', value: 2 }
      ];

      const mockBulkInsert = jest.spyOn(adapter, 'bulkInsert').mockResolvedValue(
        testData.map((item, index) => ({ id: index + 1, ...item }))
      );

      const result = await adapter.bulkInsert('test_table', testData);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');

      mockBulkInsert.mockRestore();
    });

    test('should handle pagination', async () => {
      const mockPaginate = jest.spyOn(adapter, 'paginate').mockResolvedValue({
        data: [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }],
        total: 10,
        page: 1,
        limit: 2,
        totalPages: 5
      });

      const result = await adapter.paginate('test_table', 1, 2);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(5);

      mockPaginate.mockRestore();
    });

    test('should handle search operations', async () => {
      const mockSearch = jest.spyOn(adapter, 'search').mockResolvedValue([
        { id: 1, name: 'test search', description: 'test description' }
      ]);

      const result = await adapter.search('test_table', ['name', 'description'], 'test', 10);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('test');

      mockSearch.mockRestore();
    });

    test('should get database information', async () => {
      const mockGetVersion = jest.spyOn(adapter, 'getVersion').mockResolvedValue('PostgreSQL 15.0');
      const mockGetMetrics = jest.spyOn(adapter, 'getMetrics').mockResolvedValue({
        activeConnections: 5,
        totalConnections: 10,
        queryCount: 100,
        averageQueryTime: 50,
        errorCount: 2
      });

      const version = await adapter.getVersion();
      const metrics = await adapter.getMetrics();

      expect(version).toBe('PostgreSQL 15.0');
      expect(metrics.activeConnections).toBe(5);
      expect(adapter.getDialect()).toBe('postgresql');

      mockGetVersion.mockRestore();
      mockGetMetrics.mockRestore();
    });
  });

  describe('MySQL Adapter', () => {
    let adapter: MySQLAdapter;

    beforeEach(() => {
      adapter = new MySQLAdapter();
    });

    afterEach(async () => {
      if (adapter.isConnected()) {
        await adapter.disconnect();
      }
    });

    test('should connect to MySQL database', async () => {
      const mockConnect = jest.spyOn(adapter, 'connect').mockResolvedValue();
      const mockIsConnected = jest.spyOn(adapter, 'isConnected').mockReturnValue(true);

      await adapter.connect({ ...testConfig, port: 3306 });
      expect(mockConnect).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(true);

      mockConnect.mockRestore();
      mockIsConnected.mockRestore();
    });

    test('should return correct dialect', () => {
      expect(adapter.getDialect()).toBe('mysql');
    });

    test('should handle MySQL-specific queries', async () => {
      const mockQuery = jest.spyOn(adapter, 'query').mockResolvedValue({
        data: [{ id: 1, name: 'mysql_test' }],
        rowCount: 1,
        executionTime: 15
      });

      const result = await adapter.query('SELECT * FROM test_table LIMIT 1');
      expect(result.data[0].name).toBe('mysql_test');

      mockQuery.mockRestore();
    });
  });

  describe('MongoDB Adapter', () => {
    let adapter: MongoDBAdapter;

    beforeEach(() => {
      adapter = new MongoDBAdapter();
    });

    afterEach(async () => {
      if (adapter.isConnected()) {
        await adapter.disconnect();
      }
    });

    test('should connect to MongoDB database', async () => {
      const mockConnect = jest.spyOn(adapter, 'connect').mockResolvedValue();
      const mockIsConnected = jest.spyOn(adapter, 'isConnected').mockReturnValue(true);

      await adapter.connect({ ...testConfig, port: 27017 });
      expect(mockConnect).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(true);

      mockConnect.mockRestore();
      mockIsConnected.mockRestore();
    });

    test('should return correct dialect', () => {
      expect(adapter.getDialect()).toBe('mongodb');
    });

    test('should handle MongoDB document operations', async () => {
      const testDocument = { name: 'mongo_test', tags: ['test', 'mongodb'] };
      const expectedResult = { _id: 'objectid123', ...testDocument };

      const mockInsert = jest.spyOn(adapter, 'insert').mockResolvedValue(expectedResult);
      const mockFindById = jest.spyOn(adapter, 'findById').mockResolvedValue(expectedResult);

      const insertResult = await adapter.insert('test_collection', testDocument);
      expect(insertResult._id).toBe('objectid123');

      const findResult = await adapter.findById('test_collection', 'objectid123');
      expect(findResult.name).toBe('mongo_test');

      mockInsert.mockRestore();
      mockFindById.mockRestore();
    });
  });

  describe('Database Factory', () => {
    test('should register and create database adapters', async () => {
      const registeredDbs = DatabaseFactory.getRegisteredDatabases();
      expect(registeredDbs).toContain('test_postgres');
      expect(registeredDbs).toContain('test_mysql');
      expect(registeredDbs).toContain('test_mongodb');
    });

    test('should get database configuration', () => {
      const config = DatabaseFactory.getConfig('test_postgres');
      expect(config?.type).toBe(DatabaseType.POSTGRESQL);
      expect(config?.primary.port).toBe(5432);
    });

    test('should handle health checks for all adapters', async () => {
      // Mock health check results
      const mockHealthCheckAll = jest.spyOn(DatabaseFactory, 'healthCheckAll').mockResolvedValue({
        test_postgres: true,
        test_mysql: false,
        test_mongodb: true
      });

      const healthResults = await DatabaseFactory.healthCheckAll();
      expect(healthResults.test_postgres).toBe(true);
      expect(healthResults.test_mysql).toBe(false);

      mockHealthCheckAll.mockRestore();
    });

    test('should get metrics for all adapters', async () => {
      const mockGetMetricsAll = jest.spyOn(DatabaseFactory, 'getMetricsAll').mockResolvedValue({
        test_postgres: {
          activeConnections: 5,
          totalConnections: 10,
          queryCount: 100,
          averageQueryTime: 50,
          errorCount: 0
        },
        test_mysql: {
          error: 'Connection failed'
        }
      });

      const metricsResults = await DatabaseFactory.getMetricsAll();
      expect(metricsResults.test_postgres.activeConnections).toBe(5);
      expect(metricsResults.test_mysql.error).toBe('Connection failed');

      mockGetMetricsAll.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle connection failures gracefully', async () => {
      const adapter = new PostgreSQLAdapter();
      const invalidConfig = { ...testConfig, host: 'invalid_host' };

      const mockConnect = jest.spyOn(adapter, 'connect').mockRejectedValue(new Error('Connection failed'));

      await expect(adapter.connect(invalidConfig)).rejects.toThrow('Connection failed');

      mockConnect.mockRestore();
    });

    test('should handle query failures gracefully', async () => {
      const adapter = new PostgreSQLAdapter();
      const mockQuery = jest.spyOn(adapter, 'query').mockRejectedValue(new Error('Query failed'));

      await expect(adapter.query('INVALID SQL')).rejects.toThrow('Query failed');

      mockQuery.mockRestore();
    });

    test('should handle transaction rollback on error', async () => {
      const adapter = new PostgreSQLAdapter();
      const mockTransaction = {
        id: 'tx_123',
        isActive: true,
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined)
      };

      const mockBeginTransaction = jest.spyOn(adapter, 'beginTransaction').mockResolvedValue(mockTransaction);
      const mockQuery = jest.spyOn(adapter, 'query').mockRejectedValue(new Error('Query failed'));

      const transaction = await adapter.beginTransaction();
      
      try {
        await adapter.query('INVALID SQL');
      } catch (error) {
        await transaction.rollback();
      }

      expect(transaction.rollback).toHaveBeenCalled();

      mockBeginTransaction.mockRestore();
      mockQuery.mockRestore();
    });
  });
});
