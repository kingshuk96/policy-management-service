'use strict';

/**
 * tests/scheduler.test.js
 *
 * Integration tests for the Dynamic Message Scheduler.
 *
 * Roadmap checklist covered:
 *  ✅ Test POST /api/scheduler/message with a near-future timestamp
 *  ✅ Verify scheduled_messages collection is updated on execution
 *  ✅ Test DELETE /api/scheduler/message/:taskId (cancel)
 *  ✅ Validate error cases (past date, missing fields)
 */

const supertest = require('supertest');
const ScheduledMessage = require('../src/modules/scheduler/scheduledMessage.model');
const { buildApp } = require('../src/app');

// Helper: returns a future date/time split into day and time strings
function futureDateTimeStrings(secondsFromNow = 120) {
  const future = new Date(Date.now() + secondsFromNow * 1000);
  const day = future.toISOString().split('T')[0]; // "YYYY-MM-DD"
  const time = future.toTimeString().split(' ')[0]; // "HH:MM:SS"
  return { day, time, date: future };
}

let app;

beforeAll(async () => {
  // Clear scheduled_messages before scheduler tests run
  await ScheduledMessage.deleteMany({});

  app = buildApp();
  await app.ready();
}, 15000);

afterAll(async () => {
  await app.close();
});

// ── POST /api/scheduler/message ───────────────────────────────────────────────

describe('POST /api/scheduler/message', () => {
  let createdTaskId;

  it('should schedule a message and return 201 with taskId', async () => {
    const { day, time } = futureDateTimeStrings(120); // 2 minutes from now

    const response = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({
        message: 'Send policy renewal notification to policyholders',
        day,
        time,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/scheduled successfully/i);

    const { data } = response.body;
    expect(data).toBeDefined();
    expect(typeof data.taskId).toBe('string');
    expect(data.taskId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(data.status).toBe('pending');
    expect(data.message).toBe('Send policy renewal notification to policyholders');
    expect(data.scheduledAt).toBeDefined();

    createdTaskId = data.taskId;
  });

  it('the pending record should exist in scheduled_messages collection', async () => {
    // Use the mongoose model directly — same connection used by the service
    const record = await ScheduledMessage.findOne({ taskId: createdTaskId }).lean();

    expect(record).not.toBeNull();
    expect(record.status).toBe('pending');
    expect(record.message).toBe('Send policy renewal notification to policyholders');
    // Mongoose stores unset Date fields as null, not undefined
    expect(record.executedAt).toBeFalsy();
  });

  it('should return 400 when message field is missing', async () => {
    const { day, time } = futureDateTimeStrings(120);

    const response = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({ day, time });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when day field is missing', async () => {
    const { time } = futureDateTimeStrings(120);

    const response = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({ message: 'Test', time });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for a past date', async () => {
    const response = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({
        message: 'Past date test',
        day: '2020-01-01',
        time: '00:00:00',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/future/i);
  });

  it('should return 400 for an invalid date string', async () => {
    const response = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({
        message: 'Invalid date test',
        day: 'not-a-date',
        time: 'not-a-time',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ── DELETE /api/scheduler/message/:taskId ────────────────────────────────────

describe('DELETE /api/scheduler/message/:taskId', () => {
  let taskIdToCancel;

  beforeAll(async () => {
    // Create a job to cancel
    const { day, time } = futureDateTimeStrings(300); // 5 minutes away

    const res = await supertest(app.server)
      .post('/api/scheduler/message')
      .send({ message: 'Job to be cancelled', day, time });

    taskIdToCancel = res.body.data.taskId;
  });

  it('should cancel a pending job and return 200', async () => {
    const response = await supertest(app.server)
      .delete(`/api/scheduler/message/${taskIdToCancel}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(new RegExp(taskIdToCancel));
  });

  it('should return 404 when trying to cancel a non-existent taskId', async () => {
    const response = await supertest(app.server)
      .delete('/api/scheduler/message/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

// ── Execution Verification ────────────────────────────────────────────────────

describe('Scheduler execution verification', () => {
  it(
    'should update status to executed after the job fires',
    async () => {
      // Schedule a job 2 seconds from now
      const future = new Date(Date.now() + 2000);
      const day  = future.toISOString().split('T')[0];
      const time = future.toTimeString().split(' ')[0];

      const scheduleRes = await supertest(app.server)
        .post('/api/scheduler/message')
        .send({ message: 'Execution verification message', day, time });

      expect(scheduleRes.status).toBe(201);
      const { taskId } = scheduleRes.body.data;

      // Wait 4 seconds for the job to fire and DB to be updated
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Query using the mongoose model (same connection as the service)
      const record = await ScheduledMessage.findOne({ taskId }).lean();

      expect(record).not.toBeNull();
      expect(record.status).toBe('executed');
      expect(record.executedAt).toBeDefined();
    },
    15000
  );
});
