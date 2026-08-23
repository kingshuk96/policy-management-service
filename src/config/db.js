'use strict';

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

/**
 * MongoDB connection options.
 */
const MONGO_OPTIONS = {
  maxPoolSize: 10,       
  serverSelectionTimeoutMS: 5000,  
  socketTimeoutMS: 45000,     
};

/**
 * Establishes a MongoDB connection.
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
    console.log(`[db] ✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error(`[db] ❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

// Log connection lifecycle events
mongoose.connection.on('disconnected', () => {
  console.warn('[db] ⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] 🔄 MongoDB reconnected');
});

module.exports = { connectDB };
