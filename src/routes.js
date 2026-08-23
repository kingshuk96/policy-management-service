'use strict';

/**
 * Root route aggregator plugin.
 * @param {import('fastify').FastifyInstance} fastify
 */

require('./modules/agent/agent.model');
require('./modules/user/user.model');
require('./modules/user/account.model');
require('./modules/policy/lob.model');
require('./modules/policy/carrier.model');

async function routes(fastify) {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  fastify.register(require('./modules/upload/upload.routes'), { prefix: '/api' });
  fastify.register(require('./modules/policy/policy.routes'), { prefix: '/api' });
  fastify.register(require('./modules/scheduler/scheduler.routes'), { prefix: '/api' });
}

module.exports = routes;
