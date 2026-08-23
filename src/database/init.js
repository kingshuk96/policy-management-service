'use strict';

/**
 * src/database/init.js
 *
 * Database initialization module.
 * Responsible for ensuring all collections and their indexes exist.
 */

const mongoose = require('mongoose');

// ── Model registry ───────────────────────────────────────────────────────────

const getModelRegistry = () => [
  {
    collectionName: 'agents',
    Model: require('../modules/agent/agent.model'),
  },
  {
    collectionName: 'users',
    Model: require('../modules/user/user.model'),
  },
  {
    collectionName: 'accounts',
    Model: require('../modules/user/account.model'),
  },
  {
    collectionName: 'lobs',
    Model: require('../modules/policy/lob.model'),
  },
  {
    collectionName: 'carriers',
    Model: require('../modules/policy/carrier.model'),
  },
  {
    collectionName: 'policies',
    Model: require('../modules/policy/policy.model'),
  },
  {
    collectionName: 'scheduled_messages',
    Model: require('../modules/scheduler/scheduledMessage.model'),
  },
];

/**
 * Initializes all registered collections and syncs their indexes.
 */
async function initializeDatabase(logger = console) {
  const db = mongoose.connection.db;
  const log = {
    info: (msg) => (logger.info ? logger.info(msg) : console.log(msg)),
    warn: (msg) => (logger.warn ? logger.warn(msg) : console.warn(msg)),
    error: (msg) => (logger.error ? logger.error(msg) : console.error(msg)),
  };

  const report = { created: [], existing: [], failed: [] };

  // Fetch existing collections once to avoid repeated DB calls
  const existingCollections = await db
    .listCollections()
    .toArray()
    .then((cols) => new Set(cols.map((c) => c.name)));

  const registry = getModelRegistry();

  log.info(`[db:init] Initializing ${registry.length} collections...`);

  for (const { collectionName, Model } of registry) {
    try {
      if (!existingCollections.has(collectionName)) {
        await db.createCollection(collectionName);
        report.created.push(collectionName);
        log.info(`[db:init] ✅ Created  → ${collectionName}`);
      } else {
        report.existing.push(collectionName);
        log.info(`[db:init] ⏩ Exists   → ${collectionName}`);
      }

      await Model.syncIndexes();
      log.info(`[db:init] 🔑 Indexes  → ${collectionName}`); 
    } catch (err) {
      report.failed.push(collectionName);
      log.error(`[db:init] ❌ Failed   → ${collectionName}: ${err.message}`);
    }
  }

  log.info(
    `[db:init] Done. Created: ${report.created.length} | ` +
      `Existing: ${report.existing.length} | Failed: ${report.failed.length}`
  );

  return report;
}

module.exports = { initializeDatabase };
