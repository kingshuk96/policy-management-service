'use strict';

const User = require('../user/user.model');
const Policy = require('./policy.model');


async function searchPoliciesByUsername(username) {
  if (!username || !username.trim()) {
    throw Object.assign(new Error('username query param is required'), {
      statusCode: 400,
    });
  }

  const nameRegex = new RegExp(username.trim(), 'i');

  const matchedUsers = await User.find(
    { firstName: nameRegex },
    { _id: 1 } 
  ).lean();

  if (matchedUsers.length === 0) {
    return [];
  }

  const userIds = matchedUsers.map((u) => u._id);

  const policies = await Policy.find({ userId: { $in: userIds } })
    .populate('userId',    'firstName email phone state userType')
    .populate('agentId',   'name')
    .populate('lobId',     'categoryName')
    .populate('carrierId', 'companyName')
    .lean();

  return policies;
}

async function getAggregatedPoliciesByUser() {
  const results = await Policy.aggregate([
    {
      $group: {
        _id: '$userId',
        totalPolicies: { $sum: 1 },
        totalPremiumAmount: { $sum: '$premiumAmount' },
        avgPremiumAmount: { $avg: '$premiumAmount' },
        minPremium: { $min: '$premiumAmount' },
        maxPremium: { $max: '$premiumAmount' },
        policyNumbers: { $push: '$policyNumber' },
      },
    },

    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails',
      },
    },

    {
      $unwind: {
        path: '$userDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,
        userId: '$_id',
        user: {
          firstName: '$userDetails.firstName',
          email: '$userDetails.email',
          phone: '$userDetails.phone',
          state: '$userDetails.state',
          userType: '$userDetails.userType',
        },
        summary: {
          totalPolicies: '$totalPolicies',
          totalPremiumAmount: { $round: ['$totalPremiumAmount', 2] },
          avgPremiumAmount: { $round: ['$avgPremiumAmount', 2] },
          minPremium: '$minPremium',
          maxPremium: '$maxPremium',
        },
        policyNumbers: '$policyNumbers',
      },
    },

    {
      $sort: { 'summary.totalPremiumAmount': -1 },
    },
  ]);

  return results;
}

module.exports = {
  searchPoliciesByUsername,
  getAggregatedPoliciesByUser,
};
