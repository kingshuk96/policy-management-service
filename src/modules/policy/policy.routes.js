'use strict';

const { searchPolicies, getAggregatedPolicies } = require('./policy.controller');



const searchQuerySchema = {
  type: 'object',
  required: ['username'],
  properties: {
    username: {
      type: 'string',
      minLength: 1,
      description: 'Partial or full first name to search (case-insensitive)',
    },
  },
};

const policyResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    count:   { type: 'integer' },
    data:    { type: 'array' },
  },
};

async function policyRoutes(fastify) {
  /**
   * GET /api/policies/search
   */
  fastify.get(
    '/policies/search',
    {
      schema: {
        tags: ['Policies'],
        summary: 'Search policies by username (first name)',
        querystring: searchQuerySchema,
        response: {
          200: policyResponseSchema,
        },
      },
    },
    searchPolicies
  );

  /**
   * GET /api/policies/aggregated-by-user
   */
  fastify.get(
    '/policies/aggregated-by-user',
    {
      schema: {
        tags: ['Policies'],
        summary: 'Get aggregated policy statistics grouped by user',
        response: {
          200: policyResponseSchema,
        },
      },
    },
    getAggregatedPolicies
  );
}

module.exports = policyRoutes;
