'use strict';

const mongoose = require('mongoose');

/**
 * Agent Schema
 */
const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      unique: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
