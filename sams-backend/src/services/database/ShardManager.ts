/**
 * 🔀 Database Shard Manager
 * Implements horizontal data partitioning across multiple database nodes
 */

import crypto from 'crypto';
import { 
  IShardManager, 
  IDatabaseAdapter, 
  ConnectionConfig, 
  QueryResult, 
  DatabaseMetrics 
} from './interfaces/IDatabaseAdapter';
import { DatabaseFactory } from './DatabaseFactory';
import { logger } from '../../utils/logger';

interface ShardInfo {
  id: string;
  adapter: IDatabaseAdapter;
  config: ConnectionConfig;
  weight: number;
  isActive: boolean;
  lastHealthCheck: Date;
}

interface ShardKey {
  table: string;
  column: string;
  algorithm: 'hash' | 'range' | 'directory';
}

export class ShardManager implements IShardManager {
  private shards: Map<string, ShardInfo> = new Map();
  private shardKeys: Map<string, ShardKey> = new Map();
  private consistentHashRing: Map<number, string> = new Map();
  private virtualNodes: number = 150; // Virtual nodes per physical shard
  private replicationFactor: number = 2;

  constructor() {
    this.initializeHealthMonitoring();
  }

  /**
   * Add a new shard to the cluster
   */
  async addShard(shardId: string, config: ConnectionConfig, weight: number = 1): Promise<void> {
    try {
      // Create adapter for the shard
      const adapter = await DatabaseFactory.createAdapter(`shard_${shardId}`, {
        type: config.type || 'postgresql',
        primary: config
      });

      const shardInfo: ShardInfo = {
        id: shardId,
        adapter,
        config,
        weight,
        isActive: true,
        lastHealthCheck: new Date()
      };

      this.shards.set(shardId, shardInfo);
      this.updateConsistentHashRing();

      logger.info(`Shard added: ${shardId} with weight ${weight}`);
    } catch (error) {
      logger.error(`Failed to add shard ${shardId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a shard from the cluster
   */
  async removeShard(shardId: string): Promise<void> {
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }

    // Mark as inactive first
    shard.isActive = false;

    // Migrate data to other shards if needed
    await this.migrateShardData(shardId);

    // Close connection and remove
    await shard.adapter.disconnect();
    this.shards.delete(shardId);
    this.updateConsistentHashRing();

    logger.info(`Shard removed: ${shardId}`);
  }

  /**
   * Get shard for a given key using consistent hashing
   */
  getShardForKey(key: string): string {
    if (this.shards.size === 0) {
      throw new Error('No shards available');
    }

    const hash = this.hashKey(key);
    const sortedHashes = Array.from(this.consistentHashRing.keys()).sort((a, b) => a - b);

    // Find the first hash greater than or equal to the key hash
    let targetHash = sortedHashes.find(h => h >= hash);
    
    // If not found, wrap around to the first hash
    if (targetHash === undefined) {
      targetHash = sortedHashes[0];
    }

    const shardId = this.consistentHashRing.get(targetHash)!;
    const shard = this.shards.get(shardId);

    if (!shard || !shard.isActive) {
      // Find next active shard
      return this.findNextActiveShard(targetHash);
    }

    return shardId;
  }

  /**
   * Distribute data across shards
   */
  async distributeData(table: string, data: any): Promise<void> {
    const shardKey = this.getShardKeyForTable(table);
    if (!shardKey) {
      throw new Error(`No shard key configured for table: ${table}`);
    }

    const keyValue = data[shardKey.column];
    if (keyValue === undefined) {
      throw new Error(`Shard key column '${shardKey.column}' not found in data`);
    }

    const shardId = this.getShardForKey(keyValue.toString());
    const shard = this.shards.get(shardId);

    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }

    await shard.adapter.insert(table, data);

    // Replicate to additional shards if replication is enabled
    if (this.replicationFactor > 1) {
      await this.replicateData(table, data, shardId);
    }
  }

  /**
   * Query all shards and aggregate results
   */
  async queryAllShards<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const activeShards = Array.from(this.shards.values()).filter(s => s.isActive);
    
    if (activeShards.length === 0) {
      throw new Error('No active shards available');
    }

    const promises = activeShards.map(async shard => {
      try {
        return await shard.adapter.query<T>(sql, params);
      } catch (error) {
        logger.error(`Query failed on shard ${shard.id}:`, error);
        return { data: [], rowCount: 0, executionTime: 0 };
      }
    });

    const results = await Promise.all(promises);
    
    // Aggregate results
    const aggregatedData: T[] = [];
    let totalRowCount = 0;
    let maxExecutionTime = 0;

    results.forEach(result => {
      aggregatedData.push(...result.data);
      totalRowCount += result.rowCount;
      maxExecutionTime = Math.max(maxExecutionTime, result.executionTime || 0);
    });

    return {
      data: aggregatedData,
      rowCount: totalRowCount,
      executionTime: maxExecutionTime
    };
  }

  /**
   * Query specific shard by key
   */
  async queryShardByKey<T>(key: string, sql: string, params?: any[]): Promise<QueryResult<T>> {
    const shardId = this.getShardForKey(key);
    const shard = this.shards.get(shardId);

    if (!shard) {
      throw new Error(`Shard not found: ${shardId}`);
    }

    return await shard.adapter.query<T>(sql, params);
  }

  /**
   * Get health status of all shards
   */
  async getShardHealth(): Promise<{[shardId: string]: boolean}> {
    const healthStatus: {[shardId: string]: boolean} = {};

    const healthChecks = Array.from(this.shards.entries()).map(async ([shardId, shard]) => {
      try {
        const isHealthy = await shard.adapter.healthCheck();
        healthStatus[shardId] = isHealthy;
        shard.isActive = isHealthy;
        shard.lastHealthCheck = new Date();
      } catch (error) {
        logger.error(`Health check failed for shard ${shardId}:`, error);
        healthStatus[shardId] = false;
        shard.isActive = false;
      }
    });

    await Promise.all(healthChecks);
    return healthStatus;
  }

  /**
   * Get metrics for all shards
   */
  async getShardMetrics(): Promise<{[shardId: string]: DatabaseMetrics}> {
    const metrics: {[shardId: string]: DatabaseMetrics} = {};

    const metricPromises = Array.from(this.shards.entries()).map(async ([shardId, shard]) => {
      try {
        metrics[shardId] = await shard.adapter.getMetrics();
      } catch (error) {
        logger.error(`Failed to get metrics for shard ${shardId}:`, error);
        metrics[shardId] = {
          activeConnections: 0,
          totalConnections: 0,
          queryCount: 0,
          averageQueryTime: 0,
          errorCount: 1,
          lastError: error.message
        };
      }
    });

    await Promise.all(metricPromises);
    return metrics;
  }

  /**
   * Rebalance shards by redistributing data
   */
  async rebalanceShards(): Promise<void> {
    logger.info('Starting shard rebalancing...');

    // Get current data distribution
    const distribution = await this.analyzeDataDistribution();
    
    // Identify imbalanced shards
    const imbalancedShards = this.identifyImbalancedShards(distribution);
    
    if (imbalancedShards.length === 0) {
      logger.info('Shards are already balanced');
      return;
    }

    // Redistribute data
    for (const shardId of imbalancedShards) {
      await this.redistributeShardData(shardId);
    }

    logger.info('Shard rebalancing completed');
  }

  /**
   * Configure shard key for a table
   */
  setShardKey(table: string, column: string, algorithm: 'hash' | 'range' | 'directory' = 'hash'): void {
    this.shardKeys.set(table, { table, column, algorithm });
    logger.info(`Shard key configured for table ${table}: ${column} (${algorithm})`);
  }

  /**
   * Get shard key for a table
   */
  private getShardKeyForTable(table: string): ShardKey | undefined {
    return this.shardKeys.get(table);
  }

  /**
   * Hash a key for consistent hashing
   */
  private hashKey(key: string): number {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Update consistent hash ring
   */
  private updateConsistentHashRing(): void {
    this.consistentHashRing.clear();

    for (const [shardId, shard] of this.shards) {
      if (!shard.isActive) continue;

      // Create virtual nodes for better distribution
      const virtualNodeCount = this.virtualNodes * shard.weight;
      
      for (let i = 0; i < virtualNodeCount; i++) {
        const virtualKey = `${shardId}:${i}`;
        const hash = this.hashKey(virtualKey);
        this.consistentHashRing.set(hash, shardId);
      }
    }

    logger.debug(`Consistent hash ring updated with ${this.consistentHashRing.size} virtual nodes`);
  }

  /**
   * Find next active shard in the ring
   */
  private findNextActiveShard(startHash: number): string {
    const sortedHashes = Array.from(this.consistentHashRing.keys()).sort((a, b) => a - b);
    
    for (const hash of sortedHashes) {
      if (hash > startHash) {
        const shardId = this.consistentHashRing.get(hash)!;
        const shard = this.shards.get(shardId);
        if (shard && shard.isActive) {
          return shardId;
        }
      }
    }

    // Wrap around
    for (const hash of sortedHashes) {
      const shardId = this.consistentHashRing.get(hash)!;
      const shard = this.shards.get(shardId);
      if (shard && shard.isActive) {
        return shardId;
      }
    }

    throw new Error('No active shards available');
  }

  /**
   * Replicate data to additional shards
   */
  private async replicateData(table: string, data: any, primaryShardId: string): Promise<void> {
    const replicaShards = this.getReplicaShards(primaryShardId);
    
    const replicationPromises = replicaShards.map(async shardId => {
      try {
        const shard = this.shards.get(shardId);
        if (shard && shard.isActive) {
          await shard.adapter.insert(table, data);
        }
      } catch (error) {
        logger.error(`Replication failed to shard ${shardId}:`, error);
      }
    });

    await Promise.all(replicationPromises);
  }

  /**
   * Get replica shards for a primary shard
   */
  private getReplicaShards(primaryShardId: string): string[] {
    const activeShards = Array.from(this.shards.keys()).filter(id =>
      id !== primaryShardId && this.shards.get(id)?.isActive
    );

    return activeShards.slice(0, this.replicationFactor - 1);
  }

  /**
   * Migrate data from a shard before removal
   */
  private async migrateShardData(shardId: string): Promise<void> {
    const shard = this.shards.get(shardId);
    if (!shard) return;

    logger.info(`Migrating data from shard ${shardId}...`);

    // Get all tables with shard keys
    for (const [table, shardKey] of this.shardKeys) {
      try {
        // Get all data from the shard
        const result = await shard.adapter.query(`SELECT * FROM ${table}`);

        // Redistribute each record
        for (const record of result.data) {
          const keyValue = record[shardKey.column];
          const targetShardId = this.getShardForKey(keyValue.toString());

          if (targetShardId !== shardId) {
            const targetShard = this.shards.get(targetShardId);
            if (targetShard && targetShard.isActive) {
              await targetShard.adapter.insert(table, record);
              await shard.adapter.delete(table, record.id);
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to migrate table ${table} from shard ${shardId}:`, error);
      }
    }

    logger.info(`Data migration completed for shard ${shardId}`);
  }

  /**
   * Analyze current data distribution across shards
   */
  private async analyzeDataDistribution(): Promise<{[shardId: string]: {[table: string]: number}}> {
    const distribution: {[shardId: string]: {[table: string]: number}} = {};

    for (const [shardId, shard] of this.shards) {
      if (!shard.isActive) continue;

      distribution[shardId] = {};

      for (const table of this.shardKeys.keys()) {
        try {
          const result = await shard.adapter.query(`SELECT COUNT(*) as count FROM ${table}`);
          distribution[shardId][table] = result.data[0].count || 0;
        } catch (error) {
          logger.error(`Failed to get count for table ${table} on shard ${shardId}:`, error);
          distribution[shardId][table] = 0;
        }
      }
    }

    return distribution;
  }

  /**
   * Identify imbalanced shards
   */
  private identifyImbalancedShards(distribution: {[shardId: string]: {[table: string]: number}}): string[] {
    const imbalanced: string[] = [];
    const threshold = 0.2; // 20% imbalance threshold

    for (const table of this.shardKeys.keys()) {
      const counts = Object.values(distribution).map(d => d[table] || 0);
      const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const maxDeviation = average * threshold;

      for (const [shardId, shardDistribution] of Object.entries(distribution)) {
        const count = shardDistribution[table] || 0;
        if (Math.abs(count - average) > maxDeviation) {
          if (!imbalanced.includes(shardId)) {
            imbalanced.push(shardId);
          }
        }
      }
    }

    return imbalanced;
  }

  /**
   * Redistribute data for a specific shard
   */
  private async redistributeShardData(shardId: string): Promise<void> {
    const shard = this.shards.get(shardId);
    if (!shard || !shard.isActive) return;

    logger.info(`Redistributing data for shard ${shardId}...`);

    for (const [table, shardKey] of this.shardKeys) {
      try {
        // Get sample of data to redistribute
        const result = await shard.adapter.query(
          `SELECT * FROM ${table} ORDER BY RANDOM() LIMIT 1000`
        );

        for (const record of result.data) {
          const keyValue = record[shardKey.column];
          const correctShardId = this.getShardForKey(keyValue.toString());

          if (correctShardId !== shardId) {
            const targetShard = this.shards.get(correctShardId);
            if (targetShard && targetShard.isActive) {
              await targetShard.adapter.insert(table, record);
              await shard.adapter.delete(table, record.id);
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to redistribute table ${table} for shard ${shardId}:`, error);
      }
    }

    logger.info(`Data redistribution completed for shard ${shardId}`);
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthMonitoring(): void {
    // Run health checks every 30 seconds
    setInterval(async () => {
      try {
        await this.getShardHealth();
        this.updateConsistentHashRing(); // Update ring based on health status
      } catch (error) {
        logger.error('Health monitoring failed:', error);
      }
    }, 30000);
  }

  /**
   * Get shard statistics
   */
  async getShardStatistics(): Promise<{
    totalShards: number;
    activeShards: number;
    inactiveShards: number;
    totalVirtualNodes: number;
    replicationFactor: number;
    tablesWithShardKeys: number;
  }> {
    const activeShards = Array.from(this.shards.values()).filter(s => s.isActive).length;

    return {
      totalShards: this.shards.size,
      activeShards,
      inactiveShards: this.shards.size - activeShards,
      totalVirtualNodes: this.consistentHashRing.size,
      replicationFactor: this.replicationFactor,
      tablesWithShardKeys: this.shardKeys.size
    };
  }

  /**
   * Set replication factor
   */
  setReplicationFactor(factor: number): void {
    if (factor < 1) {
      throw new Error('Replication factor must be at least 1');
    }
    this.replicationFactor = factor;
    logger.info(`Replication factor set to ${factor}`);
  }

  /**
   * Get all shard IDs
   */
  getShardIds(): string[] {
    return Array.from(this.shards.keys());
  }

  /**
   * Get active shard IDs
   */
  getActiveShardIds(): string[] {
    return Array.from(this.shards.values())
      .filter(shard => shard.isActive)
      .map(shard => shard.id);
  }
}
