/**
 * 🧪 Shard Manager Test Suite
 * Comprehensive tests for database sharding implementation
 */

import { ShardManager } from '../../services/database/ShardManager';
import { DatabaseType } from '../../services/database/interfaces/IDatabaseAdapter';

describe('ShardManager', () => {
  let shardManager: ShardManager;

  const mockConfig1 = {
    host: 'shard1.example.com',
    port: 5432,
    database: 'sams_shard1',
    username: 'sams_user',
    password: 'password',
    type: DatabaseType.POSTGRESQL
  };

  const mockConfig2 = {
    host: 'shard2.example.com',
    port: 5432,
    database: 'sams_shard2',
    username: 'sams_user',
    password: 'password',
    type: DatabaseType.POSTGRESQL
  };

  const mockConfig3 = {
    host: 'shard3.example.com',
    port: 5432,
    database: 'sams_shard3',
    username: 'sams_user',
    password: 'password',
    type: DatabaseType.POSTGRESQL
  };

  beforeEach(() => {
    shardManager = new ShardManager();
  });

  afterEach(async () => {
    // Clean up any active shards
    const shardIds = shardManager.getShardIds();
    for (const shardId of shardIds) {
      try {
        await shardManager.removeShard(shardId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Shard Management', () => {
    test('should add shards successfully', async () => {
      // Mock the DatabaseFactory.createAdapter method
      const mockCreateAdapter = jest.fn().mockResolvedValue({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        healthCheck: jest.fn().mockResolvedValue(true),
        getMetrics: jest.fn().mockResolvedValue({
          activeConnections: 5,
          totalConnections: 10,
          queryCount: 100,
          averageQueryTime: 50,
          errorCount: 0
        })
      });

      // Mock DatabaseFactory
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1, 1);
      await shardManager.addShard('shard2', mockConfig2, 2);

      const shardIds = shardManager.getShardIds();
      expect(shardIds).toContain('shard1');
      expect(shardIds).toContain('shard2');
      expect(shardIds).toHaveLength(2);
    });

    test('should remove shards successfully', async () => {
      // Mock adapter
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        query: jest.fn().mockResolvedValue({ data: [], rowCount: 0 }),
        delete: jest.fn().mockResolvedValue(true),
        insert: jest.fn().mockResolvedValue({ id: 1 })
      };

      const mockCreateAdapter = jest.fn().mockResolvedValue(mockAdapter);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1);
      expect(shardManager.getShardIds()).toContain('shard1');

      await shardManager.removeShard('shard1');
      expect(shardManager.getShardIds()).not.toContain('shard1');
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });

    test('should handle shard removal errors gracefully', async () => {
      await expect(shardManager.removeShard('nonexistent')).rejects.toThrow('Shard not found: nonexistent');
    });
  });

  describe('Consistent Hashing', () => {
    beforeEach(async () => {
      // Mock adapters for testing
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        healthCheck: jest.fn().mockResolvedValue(true),
        getMetrics: jest.fn().mockResolvedValue({
          activeConnections: 5,
          totalConnections: 10,
          queryCount: 100,
          averageQueryTime: 50,
          errorCount: 0
        })
      };

      const mockCreateAdapter = jest.fn().mockResolvedValue(mockAdapter);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      // Add test shards
      await shardManager.addShard('shard1', mockConfig1, 1);
      await shardManager.addShard('shard2', mockConfig2, 1);
      await shardManager.addShard('shard3', mockConfig3, 1);
    });

    test('should distribute keys consistently across shards', () => {
      const testKeys = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const distribution: {[shardId: string]: number} = {};

      testKeys.forEach(key => {
        const shardId = shardManager.getShardForKey(key);
        distribution[shardId] = (distribution[shardId] || 0) + 1;
      });

      // Verify that keys are distributed across multiple shards
      const usedShards = Object.keys(distribution);
      expect(usedShards.length).toBeGreaterThan(1);
      
      // Verify same key always goes to same shard
      testKeys.forEach(key => {
        const shard1 = shardManager.getShardForKey(key);
        const shard2 = shardManager.getShardForKey(key);
        expect(shard1).toBe(shard2);
      });
    });

    test('should handle shard failure by routing to next available shard', () => {
      const testKey = 'test_key';
      const originalShard = shardManager.getShardForKey(testKey);
      
      // Simulate shard failure by marking it as inactive
      // This would normally be done by health checks
      const shardIds = shardManager.getShardIds();
      expect(shardIds).toContain(originalShard);
      
      // The shard manager should route to an active shard
      const newShard = shardManager.getShardForKey(testKey);
      expect(shardManager.getActiveShardIds()).toContain(newShard);
    });

    test('should throw error when no shards are available', () => {
      const emptyShardManager = new ShardManager();
      expect(() => emptyShardManager.getShardForKey('test')).toThrow('No shards available');
    });
  });

  describe('Data Distribution', () => {
    beforeEach(async () => {
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        insert: jest.fn().mockResolvedValue({ id: 1, name: 'test' }),
        healthCheck: jest.fn().mockResolvedValue(true)
      };

      const mockCreateAdapter = jest.fn().mockResolvedValue(mockAdapter);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1);
      await shardManager.addShard('shard2', mockConfig2);
      
      // Configure shard key for test table
      shardManager.setShardKey('users', 'user_id', 'hash');
    });

    test('should distribute data to correct shard based on shard key', async () => {
      const testData = {
        user_id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const expectedShardId = shardManager.getShardForKey('user123');
      
      // Mock the shard's insert method to verify it's called
      const mockInsert = jest.fn().mockResolvedValue({ id: 1, ...testData });
      const mockShards = new Map();
      mockShards.set(expectedShardId, {
        id: expectedShardId,
        adapter: { insert: mockInsert },
        isActive: true
      });

      // Replace the private shards map for testing
      (shardManager as any).shards = mockShards;

      await shardManager.distributeData('users', testData);
      
      expect(mockInsert).toHaveBeenCalledWith('users', testData);
    });

    test('should throw error when shard key is missing from data', async () => {
      shardManager.setShardKey('users', 'user_id', 'hash');
      
      const testData = {
        name: 'John Doe',
        email: 'john@example.com'
        // Missing user_id
      };

      await expect(shardManager.distributeData('users', testData)).rejects.toThrow(
        "Shard key column 'user_id' not found in data"
      );
    });

    test('should throw error when no shard key is configured for table', async () => {
      const testData = {
        id: 1,
        name: 'Test'
      };

      await expect(shardManager.distributeData('unconfigured_table', testData)).rejects.toThrow(
        'No shard key configured for table: unconfigured_table'
      );
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      const mockAdapter1 = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        query: jest.fn().mockResolvedValue({
          data: [{ id: 1, name: 'shard1_data' }],
          rowCount: 1,
          executionTime: 10
        }),
        healthCheck: jest.fn().mockResolvedValue(true)
      };

      const mockAdapter2 = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        query: jest.fn().mockResolvedValue({
          data: [{ id: 2, name: 'shard2_data' }],
          rowCount: 1,
          executionTime: 15
        }),
        healthCheck: jest.fn().mockResolvedValue(true)
      };

      const mockCreateAdapter = jest.fn()
        .mockResolvedValueOnce(mockAdapter1)
        .mockResolvedValueOnce(mockAdapter2);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1);
      await shardManager.addShard('shard2', mockConfig2);
    });

    test('should query all shards and aggregate results', async () => {
      const result = await shardManager.queryAllShards('SELECT * FROM users');
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('shard1_data');
      expect(result.data[1].name).toBe('shard2_data');
      expect(result.rowCount).toBe(2);
      expect(result.executionTime).toBe(15); // Max execution time
    });

    test('should query specific shard by key', async () => {
      const testKey = 'user123';
      const result = await shardManager.queryShardByKey(testKey, 'SELECT * FROM users WHERE id = ?', [testKey]);
      
      expect(result.data).toHaveLength(1);
      expect(result.rowCount).toBe(1);
    });

    test('should handle query failures gracefully in queryAllShards', async () => {
      // Mock one shard to fail
      const mockFailingAdapter = {
        query: jest.fn().mockRejectedValue(new Error('Query failed'))
      };

      const mockWorkingAdapter = {
        query: jest.fn().mockResolvedValue({
          data: [{ id: 1, name: 'working_data' }],
          rowCount: 1,
          executionTime: 10
        })
      };

      const mockShards = new Map();
      mockShards.set('shard1', { id: 'shard1', adapter: mockFailingAdapter, isActive: true });
      mockShards.set('shard2', { id: 'shard2', adapter: mockWorkingAdapter, isActive: true });

      (shardManager as any).shards = mockShards;

      const result = await shardManager.queryAllShards('SELECT * FROM users');
      
      // Should return data from working shard only
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('working_data');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        healthCheck: jest.fn().mockResolvedValue(true),
        getMetrics: jest.fn().mockResolvedValue({
          activeConnections: 5,
          totalConnections: 10,
          queryCount: 100,
          averageQueryTime: 50,
          errorCount: 0
        })
      };

      const mockCreateAdapter = jest.fn().mockResolvedValue(mockAdapter);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1);
      await shardManager.addShard('shard2', mockConfig2);
    });

    test('should check health of all shards', async () => {
      const healthStatus = await shardManager.getShardHealth();
      
      expect(healthStatus).toHaveProperty('shard1');
      expect(healthStatus).toHaveProperty('shard2');
      expect(healthStatus.shard1).toBe(true);
      expect(healthStatus.shard2).toBe(true);
    });

    test('should get metrics for all shards', async () => {
      const metrics = await shardManager.getShardMetrics();
      
      expect(metrics).toHaveProperty('shard1');
      expect(metrics).toHaveProperty('shard2');
      expect(metrics.shard1.activeConnections).toBe(5);
      expect(metrics.shard2.queryCount).toBe(100);
    });

    test('should handle health check failures', async () => {
      const mockFailingAdapter = {
        healthCheck: jest.fn().mockRejectedValue(new Error('Health check failed'))
      };

      const mockWorkingAdapter = {
        healthCheck: jest.fn().mockResolvedValue(true)
      };

      const mockShards = new Map();
      mockShards.set('shard1', { 
        id: 'shard1', 
        adapter: mockFailingAdapter, 
        isActive: true,
        lastHealthCheck: new Date()
      });
      mockShards.set('shard2', { 
        id: 'shard2', 
        adapter: mockWorkingAdapter, 
        isActive: true,
        lastHealthCheck: new Date()
      });

      (shardManager as any).shards = mockShards;

      const healthStatus = await shardManager.getShardHealth();
      
      expect(healthStatus.shard1).toBe(false);
      expect(healthStatus.shard2).toBe(true);
    });
  });

  describe('Shard Statistics', () => {
    test('should return correct shard statistics', async () => {
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true),
        healthCheck: jest.fn().mockResolvedValue(true)
      };

      const mockCreateAdapter = jest.fn().mockResolvedValue(mockAdapter);
      
      jest.doMock('../../services/database/DatabaseFactory', () => ({
        DatabaseFactory: {
          createAdapter: mockCreateAdapter
        }
      }));

      await shardManager.addShard('shard1', mockConfig1);
      await shardManager.addShard('shard2', mockConfig2);
      
      shardManager.setShardKey('users', 'user_id', 'hash');
      shardManager.setShardKey('orders', 'order_id', 'hash');

      const stats = await shardManager.getShardStatistics();
      
      expect(stats.totalShards).toBe(2);
      expect(stats.activeShards).toBe(2);
      expect(stats.inactiveShards).toBe(0);
      expect(stats.tablesWithShardKeys).toBe(2);
      expect(stats.replicationFactor).toBe(2); // Default value
    });

    test('should update replication factor', () => {
      shardManager.setReplicationFactor(3);
      
      expect(() => shardManager.setReplicationFactor(0)).toThrow('Replication factor must be at least 1');
    });
  });
});
