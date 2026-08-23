'use strict';

/**
 * tests/setup.js
 *
 * Loaded via Jest setupFilesAfterEnv — registers global beforeAll/afterAll
 * hooks that run once across all test files (with --runInBand).
 *
 * By the time this runs, env.setup.js (loaded via setupFiles) has already:
 *  - loaded .env via dotenv
 *  - overridden process.env.MONGO_URI to use policy_management_test
 *
 * So we just use process.env.MONGO_URI directly here.
 */

const mongoose = require('mongoose');

const COLLECTIONS = [
  'agents',
  'users',
  'accounts',
  'lobs',
  'carriers',
  'policies',
  'scheduled_messages',
];

// ── Expose clearCollections as a global helper ────────────────────────────────
global.clearCollections = async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  const existing = await db
    .listCollections()
    .toArray()
    .then((cols) => new Set(cols.map((c) => c.name)));

  for (const name of COLLECTIONS) {
    if (existing.has(name)) {
      await db.collection(name).deleteMany({});
    }
  }
};

// ── Connect once before the whole suite ──────────────────────────────────────
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[test:db] ✅ Connected to: ${mongoose.connection.host}`);
    console.log(`[test:db] 📦 Database: ${mongoose.connection.db.databaseName}`);
  }
}, 25000);

// ── Disconnect after the whole suite ─────────────────────────────────────────
afterAll(async () => {
  await mongoose.disconnect();
  console.log('[test:db] 🛑 Disconnected from test DB');
}, 10000);

