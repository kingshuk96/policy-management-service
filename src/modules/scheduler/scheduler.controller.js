'use strict';

const schedulerService = require('./scheduler.service');


async function createScheduledMessage(request, reply) {
  const { message, day, time } = request.body;

  const result = await schedulerService.scheduleMessage({ message, day, time });

  return reply.status(201).send({
    success: true,
    message: 'Message scheduled successfully',
    data: {
      taskId:      result.taskId,
      message:     result.message,
      scheduledAt: result.scheduledAt,
      status:      result.status,
    },
  });
}

async function cancelScheduledMessage(request, reply) {
  const { taskId } = request.params;

  const cancelled = await schedulerService.cancelScheduledMessage(taskId);

  if (!cancelled) {
    return reply.status(404).send({
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: `No active scheduled job found with taskId: ${taskId}`,
    });
  }

  return reply.send({
    success: true,
    message: `Scheduled job "${taskId}" has been cancelled.`,
  });
}

module.exports = {
  createScheduledMessage,
  cancelScheduledMessage,
};
