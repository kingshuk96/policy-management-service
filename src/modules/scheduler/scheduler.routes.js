'use strict';

const {
  createScheduledMessage,
  cancelScheduledMessage,
} = require('./scheduler.controller');

const createBodySchema = {
  type: 'object',
  required: ['message', 'day', 'time'],
  properties: {
    message: {
      type: 'string',
      minLength: 1,
      description: 'The message content to persist when the job fires',
    },
    day: {
      type: 'string',
      minLength: 1,
      description: 'Target date — e.g. "2024-12-25" or "December 25, 2024"',
    },
    time: {
      type: 'string',
      minLength: 1,
      description: 'Target time — e.g. "14:30:00" or "2:30 PM"',
    },
  },
  additionalProperties: false,
};

const createResponseSchema = {
  type: 'object',
  properties: {
    success:  { type: 'boolean' },
    message:  { type: 'string' },
    data: {
      type: 'object',
      properties: {
        taskId:      { type: 'string' },
        message:     { type: 'string' },
        scheduledAt: { type: 'string', format: 'date-time' },
        status:      { type: 'string' },
      },
    },
  },
};


async function schedulerRoutes(fastify) {
  /**
   * POST /api/scheduler/message
   */
  fastify.post(
    '/scheduler/message',
    {
      schema: {
        tags: ['Scheduler'],
        summary: 'Schedule a message for future DB insertion',
        body: createBodySchema,
        response: {
          201: createResponseSchema,
        },
      },
    },
    createScheduledMessage
  );

  /**
   * DELETE /api/scheduler/message/:taskId
   */
  fastify.delete(
    '/scheduler/message/:taskId',
    {
      schema: {
        tags: ['Scheduler'],
        summary: 'Cancel a pending scheduled message',
        params: {
          type: 'object',
          required: ['taskId'],
          properties: {
            taskId: { type: 'string', description: 'UUID of the scheduled job' },
          },
        },
      },
    },
    cancelScheduledMessage
  );
}

module.exports = schedulerRoutes;
