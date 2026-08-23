'use strict';

const mongoose = require('mongoose');

/**
 * Account Schema
 */
const accountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
