'use strict';

const mongoose = require('mongoose');

/**
 * ScheduledMessage Schema
 */
const scheduledMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    targetDate: {
      type: String,
      required: [true, 'Target date is required'],
    },
    targetTime: {
      type: String,
      required: [true, 'Target time is required'],
    },
    executedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'executed', 'failed'],
      default: 'pending',
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
