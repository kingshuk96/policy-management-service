'use strict';

const mongoose = require('mongoose');

/**
 * User Schema
 */
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true,
    },
    dob: {
      type: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    },
    userType: {
      type: String,
      enum: ['Primary', 'Secondary', 'Dependent'],
      default: 'Primary',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
