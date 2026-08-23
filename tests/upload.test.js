'use strict';

/**
 * tests/upload.test.js
 *
 * Integration tests for POST /api/upload
 *
 * Roadmap checklist covered:
 *  ✅ Test POST /api/upload with a sample CSV file
 *  ✅ Verify all 6 collections are populated correctly after ingestion
 */

const path = require('path');
const fs = require('fs');
const supertest = require('supertest');
const mongoose = require('mongoose');
const { buildApp } = require('../src/app');

const SAMPLE_CSV = path.join(__dirname, 'fixtures', 'sample_data.csv');

let app;

beforeAll(async () => {
  // Clear all collections before seeding
  await global.clearCollections();

  app = buildApp();
  await app.ready();
}, 15000);

afterAll(async () => {
  await app.close();
});

// ── POST /api/upload ──────────────────────────────────────────────────────────

describe('POST /api/upload', () => {
  it('should ingest the sample CSV and return 200 with an ingestion summary', async () => {
    const csvBuffer = fs.readFileSync(SAMPLE_CSV);

    const response = await supertest(app.server)
      .post('/api/upload')
      .attach('file', csvBuffer, {
        filename: 'sample_data.csv',
        contentType: 'text/csv',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/ingested successfully/i);

    const { data } = response.body;
    expect(data).toBeDefined();
    expect(data.originalName).toBe('sample_data.csv');
    expect(typeof data.totalRows).toBe('number');
    expect(typeof data.processed).toBe('number');
    expect(typeof data.failed).toBe('number');
    expect(typeof data.duration).toBe('string');

    // All 10 data rows should be processed, none should fail
    expect(data.totalRows).toBe(10);
    expect(data.processed).toBe(10);
    expect(data.failed).toBe(0);
  }, 30000); // Worker thread ingestion can take a few seconds

  it('should reject a non-CSV/XLSX file with 400', async () => {
    const txtBuffer = Buffer.from('this is not a valid file');

    const response = await supertest(app.server)
      .post('/api/upload')
      .attach('file', txtBuffer, {
        filename: 'invalid.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  }, 10000);

  it('should return an error when no file is attached', async () => {
    const response = await supertest(app.server)
      .post('/api/upload')
      .set('Content-Type', 'multipart/form-data; boundary=----boundary');

    // Fastify multipart returns 500 (boundary parse error) for empty multipart.
    // We just assert it's not 200 — the upload was not accepted.
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
  }, 10000);
});

// ── Collection Population Verification ───────────────────────────────────────

describe('Collection population after ingestion', () => {
  // These tests rely on data seeded by the upload test above.
  // Jest runs tests in the same file sequentially, so seeding is guaranteed.

  it('agents collection should be non-empty', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('agents').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('users collection should contain 5 distinct users', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('users').countDocuments();
    expect(count).toBe(5); // john, jane, bob, alice, carlos
  });

  it('accounts collection should be non-empty', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('accounts').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('lobs collection should be non-empty', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('lobs').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('carriers collection should be non-empty', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('carriers').countDocuments();
    expect(count).toBeGreaterThan(0);
  });

  it('policies collection should contain 10 policy records', async () => {
    const db = mongoose.connection.db;
    const count = await db.collection('policies').countDocuments();
    expect(count).toBe(10);
  });
});
