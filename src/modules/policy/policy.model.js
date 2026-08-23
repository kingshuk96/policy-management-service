'use strict';

const mongoose = require('mongoose');

/**
 * Policy Schema
 */
const policySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: [true, 'Policy number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    policyStartDate: {
      type: Date,
      required: [true, 'Policy start date is required'],
    },
    policyEndDate: {
      type: Date,
      required: [true, 'Policy end date is required'],
    },
    lobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lob',
      required: [true, 'Line of business reference is required'],
      index: true,
    },
    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Carrier',
      required: [true, 'Carrier reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent reference is required'],
      index: true,
    },
    premiumAmount: {
      type: Number,
      required: [true, 'Premium amount is required'],
      min: [0, 'Premium amount cannot be negative'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy', policySchema);
