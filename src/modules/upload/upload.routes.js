'use strict';

const { handleUpload } = require('./upload.controller');

/**
 * POST /api/upload — Upload a .csv or .xlsx file 
 */
async function uploadRoutes(fastify) {
  fastify.post(
    '/upload',
    {
      schema: {
        tags: ['Upload'],
        summary: 'Ingest a CSV or XLSX file via Worker Thread',
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success:  { type: 'boolean' },
              message:  { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  originalName: { type: 'string' },
                  totalRows:    { type: 'integer' },
                  processed:    { type: 'integer' },
                  failed:       { type: 'integer' },
                  duration:     { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success:    { type: 'boolean' },
              statusCode: { type: 'integer' },
              error:      { type: 'string' },
              message:    { type: 'string' },
            },
          },
        },
      },
    },
    handleUpload
  );
}

module.exports = uploadRoutes;
