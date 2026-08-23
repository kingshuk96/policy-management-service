'use strict';

const policyService = require('./policy.service');


async function searchPolicies(request, reply) {
  const { username } = request.query;

  const policies = await policyService.searchPoliciesByUsername(username);

  return reply.send({
    success: true,
    count: policies.length,
    data: policies,
  });
}

async function getAggregatedPolicies(request, reply) {
  const results = await policyService.getAggregatedPoliciesByUser();

  return reply.send({
    success: true,
    count: results.length,
    data: results,
  });
}

module.exports = {
  searchPolicies,
  getAggregatedPolicies,
};
