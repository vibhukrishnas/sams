/**
 * 🐘 PostgreSQL Configuration
 * Handles PostgreSQL connection with Sequelize
 */

const { Sequelize } = require('sequelize');
const logger = require('./logger');

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'infrastructure_monitoring',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Test connection function
const connectPostgreSQL = async () => {
  try {
    await sequelize.authenticate();
    logger.info('🐘 PostgreSQL connected successfully');
    
    // Sync database in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('PostgreSQL database synchronized');
    }
    
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await sequelize.close();
  logger.info('PostgreSQL connection closed through app termination');
});

module.exports = connectPostgreSQL;
module.exports.sequelize = sequelize;
