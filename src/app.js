'use strict';

const fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const { errorHandler } = require('./middlewares/errorHandler.middleware');
const routes = require('./routes');
const { IS_DEV } = require('./config/env');

/**
 * Builds and configures the Fastify application instance.
 *
 * @returns {import('fastify').FastifyInstance}
 */
function buildApp() {
  const app = fastify({
    logger: {
      level: IS_DEV ? 'info' : 'warn',
      transport: IS_DEV
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  app.register(cors, {
    origin: IS_DEV ? '*' : process.env.ALLOWED_ORIGINS?.split(',') || [],
  });

  app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB max
    },
  });

  app.setErrorHandler(errorHandler);

  app.register(routes);

  return app;
}

module.exports = { buildApp };
