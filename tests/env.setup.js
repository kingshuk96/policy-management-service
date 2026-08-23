'use strict';

/**
 * tests/env.setup.js
 *
 * Loaded via Jest `setupFiles` — runs BEFORE the test framework and BEFORE
 * any test files are imported. This is the correct place to override
 * environment variables for the test environment.
 *
 * We replace the database name in MONGO_URI so that both the Fastify app
 * AND the worker thread use `policy_management_test` — keeping dev data safe.
 */

require('dotenv').config();

function buildTestUri(mongoUri) {
  if (!mongoUri) return mongoUri;
  return mongoUri.replace(/\/([^/?]+)(\?|$)/, '/policy_management_test$2');
}

// Override MONGO_URI for all modules loaded during tests
process.env.MONGO_URI = buildTestUri(process.env.MONGO_URI);
