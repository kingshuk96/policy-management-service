'use strict';

const mongoose = require('mongoose');

/**
 * Carrier Schema
 */
const carrierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carrier', carrierSchema);
