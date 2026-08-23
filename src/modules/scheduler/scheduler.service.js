'use strict';


const schedule = require('node-schedule');
const { v4: uuidv4 } = require('uuid');
const ScheduledMessage = require('./scheduledMessage.model');

const activeJobs = new Map();


async function scheduleMessage({ message, day, time }) {
  const targetDate = new Date(`${day} ${time}`);

  if (isNaN(targetDate.getTime())) {
    throw Object.assign(
      new Error(
        `Invalid date/time combination: "${day} ${time}". ` +
          'Use ISO format e.g. day="2024-12-25" time="14:30:00"'
      ),
      { statusCode: 400 }
    );
  }

  if (targetDate <= new Date()) {
    throw Object.assign(
      new Error('Scheduled time must be in the future.'),
      { statusCode: 400 }
    );
  }
  const taskId = uuidv4();
  const record = await ScheduledMessage.create({
    taskId,
    message,
    targetDate: day,
    targetTime: time,
    status:     'pending',
  });
  const job = schedule.scheduleJob(taskId, targetDate, async () => {
    try {
      const current = await ScheduledMessage.findOne({ taskId });
      if (!current || current.status !== 'pending') {
        return;
      }

      await ScheduledMessage.findOneAndUpdate(
        { taskId, status: 'pending' },
        {
          status:     'executed',
          executedAt: new Date(),
        }
      );
    } catch (err) {
      await ScheduledMessage.findOneAndUpdate(
        { taskId },
        { status: 'failed' }
      ).catch(() => {});
    } finally {
      activeJobs.delete(taskId);
    }
  });

  if (!job) {
    await ScheduledMessage.findOneAndUpdate({ taskId }, { status: 'failed' });
    throw Object.assign(
      new Error('Failed to schedule job — the target time may have already passed.'),
      { statusCode: 400 }
    );
  }
  activeJobs.set(taskId, job);
  return {
    taskId,
    message: record.message,
    scheduledAt: targetDate,
    status: 'pending',
  };
}

async function cancelScheduledMessage(taskId) {
  const job = activeJobs.get(taskId) || schedule.scheduledJobs[taskId];
  if (job) {
    job.cancel();
    activeJobs.delete(taskId);
  }

  const record = await ScheduledMessage.findOneAndUpdate(
    { taskId, status: 'pending' },
    { status: 'cancelled' },
    { new: true }
  );

  if (!record && !job) {
    return false;
  }

  return true;
}


function getActiveJobs() {
  return [...activeJobs.keys()];
}

module.exports = {
  scheduleMessage,
  cancelScheduledMessage,
  getActiveJobs,
};
