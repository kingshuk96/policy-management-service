'use strict';

const mongoose = require('mongoose');

/**
 * Lob (Line of Business) Schema
 */
const lobSchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lob', lobSchema);
