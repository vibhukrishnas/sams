/**
 * 🔴 Redis Configuration
 * Handles Redis connection for caching and sessions
 */

const redis = require('redis');
const logger = require('./logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
  database: redisConfig.db,
});

// Error handling
redisClient.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  logger.info('🔴 Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('end', () => {
  logger.info('Redis connection ended');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  logger.info('Redis connection closed through app termination');
});

module.exports = redisClient;
