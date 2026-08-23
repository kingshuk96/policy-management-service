'use strict';

require('dotenv').config();

/**
 * Validates that all required environment variables are present.
 */
const REQUIRED_VARS = ['MONGO_URI', 'PORT', 'CPU_THRESHOLD'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file.`
  );
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  MONGO_URI: process.env.MONGO_URI,
  CPU_THRESHOLD: parseFloat(process.env.CPU_THRESHOLD) || 70,
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEV: process.env.NODE_ENV !== 'production',
};
