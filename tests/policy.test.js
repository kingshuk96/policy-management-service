'use strict';

/**
 * tests/policy.test.js
 *
 * Integration tests for policy search and aggregation endpoints.
 *
 * Roadmap checklist covered:
 *  ✅ Test GET /api/policies/search?username=John
 *  ✅ Test GET /api/policies/aggregated-by-user
 *
 * This suite seeds its own data via POST /api/upload before running.
 * This makes it fully independent of test execution order.
 */

const path = require('path');
const fs = require('fs');
const supertest = require('supertest');
const { buildApp } = require('../src/app');

const SAMPLE_CSV = path.join(__dirname, 'fixtures', 'sample_data.csv');

let app;

beforeAll(async () => {
  // Clear all collections and seed fresh data for this suite
  await global.clearCollections();

  app = buildApp();
  await app.ready();

  // Seed data via upload endpoint
  const csvBuffer = fs.readFileSync(SAMPLE_CSV);
  const uploadRes = await supertest(app.server)
    .post('/api/upload')
    .attach('file', csvBuffer, {
      filename: 'sample_data.csv',
      contentType: 'text/csv',
    });

  if (uploadRes.status !== 200) {
    throw new Error(
      `[policy.test] Upload seeding failed (${uploadRes.status}): ${JSON.stringify(uploadRes.body)}`
    );
  }
}, 45000); // Allow time for worker thread + Atlas ingestion

afterAll(async () => {
  await app.close();
});

// ── GET /api/policies/search ──────────────────────────────────────────────────

describe('GET /api/policies/search', () => {
  it('should return populated policies for username=John', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/search?username=John');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.count).toBe('number');
    expect(response.body.count).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data)).toBe(true);

    const policy = response.body.data[0];

    // Check top-level policy fields
    expect(policy).toHaveProperty('policyNumber');
    expect(policy).toHaveProperty('premiumAmount');
    expect(policy).toHaveProperty('policyStartDate');
    expect(policy).toHaveProperty('policyEndDate');

    // Check populated userId
    expect(policy.userId).toBeDefined();
    expect(policy.userId.firstName).toMatch(/john/i);
    expect(policy.userId).toHaveProperty('email');
    expect(policy.userId).toHaveProperty('phone');
    expect(policy.userId).toHaveProperty('state');
    expect(policy.userId).toHaveProperty('userType');

    // Check populated agentId
    expect(policy.agentId).toBeDefined();
    expect(policy.agentId).toHaveProperty('name');

    // Check populated lobId
    expect(policy.lobId).toBeDefined();
    expect(policy.lobId).toHaveProperty('categoryName');

    // Check populated carrierId
    expect(policy.carrierId).toBeDefined();
    expect(policy.carrierId).toHaveProperty('companyName');
  });

  it('John should have exactly 3 policies from the sample data', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/search?username=John');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(3);
  });

  it('should do case-insensitive search (username=john)', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/search?username=john');

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThan(0);
  });

  it('should return empty array for a username that does not exist', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/search?username=NonExistentUser999');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(0);
    expect(response.body.data).toEqual([]);
  });

  it('should return 400 when username param is missing', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/search');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ── GET /api/policies/aggregated-by-user ─────────────────────────────────────

describe('GET /api/policies/aggregated-by-user', () => {
  it('should return 200 with an aggregated summary array', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/aggregated-by-user');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.count).toBe('number');
    expect(response.body.count).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should return one entry per unique user (5 users in sample data)', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/aggregated-by-user');

    expect(response.body.count).toBe(5);
  });

  it('each aggregated entry should have the correct shape', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/aggregated-by-user');

    const entry = response.body.data[0];

    // Top-level fields
    expect(entry).toHaveProperty('userId');
    expect(entry).toHaveProperty('user');
    expect(entry).toHaveProperty('summary');
    expect(entry).toHaveProperty('policyNumbers');

    // User sub-object
    expect(entry.user).toHaveProperty('firstName');
    expect(entry.user).toHaveProperty('email');
    expect(entry.user).toHaveProperty('phone');
    expect(entry.user).toHaveProperty('state');
    expect(entry.user).toHaveProperty('userType');

    // Summary sub-object
    expect(entry.summary).toHaveProperty('totalPolicies');
    expect(entry.summary).toHaveProperty('totalPremiumAmount');
    expect(entry.summary).toHaveProperty('avgPremiumAmount');
    expect(entry.summary).toHaveProperty('minPremium');
    expect(entry.summary).toHaveProperty('maxPremium');

    // policyNumbers is an array of strings
    expect(Array.isArray(entry.policyNumbers)).toBe(true);
    expect(entry.policyNumbers.length).toBeGreaterThan(0);
    expect(typeof entry.policyNumbers[0]).toBe('string');
  });

  it('should be sorted by totalPremiumAmount descending', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/aggregated-by-user');

    const totals = response.body.data.map(
      (e) => e.summary.totalPremiumAmount
    );

    for (let i = 0; i < totals.length - 1; i++) {
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i + 1]);
    }
  });

  it('John total premium should equal 3800 (1250 + 850 + 1700)', async () => {
    const response = await supertest(app.server)
      .get('/api/policies/aggregated-by-user');

    const johnEntry = response.body.data.find(
      (e) => e.user.firstName === 'John'
    );
    expect(johnEntry).toBeDefined();
    expect(johnEntry.summary.totalPolicies).toBe(3);
    expect(johnEntry.summary.totalPremiumAmount).toBeCloseTo(3800, 1);
  });
});
