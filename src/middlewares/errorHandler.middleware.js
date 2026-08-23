'use strict';

/**
 * Centralized Fastify error handler.
 */
async function errorHandler(error, request, reply) {
  const statusCode = error.statusCode || error.status || 500;

  // Log server-side errors
  if (statusCode >= 500) {
    request.log.error({ err: error }, 'Unhandled server error');
  }

  // Fastify validation errors (AJV schema failures)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    return reply.status(409).send({
      success: false,
      statusCode: 409,
      error: 'Conflict',
      message: `Duplicate value for ${field}`,
    });
  }

  return reply.status(statusCode).send({
    success: false,
    statusCode,
    error: error.name || 'Error',
    message: error.message || 'An unexpected error occurred',
  });
}

module.exports = { errorHandler };
