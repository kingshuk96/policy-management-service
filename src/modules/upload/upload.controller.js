'use strict';

const { saveUploadedFile } = require('../../middlewares/upload.middleware');
const uploadService = require('./upload.service');

async function handleUpload(request, reply) {
  const fileInfo = await saveUploadedFile(request);

  request.log.info(
    `[upload] File received: ${fileInfo.originalName} (${fileInfo.fileType.toUpperCase()})`
  );
  const result = await uploadService.processFile(fileInfo);

  request.log.info(
    `[upload] ✅ Ingestion complete — ` +
      `${result.processed} processed, ${result.failed} failed in ${result.duration}`
  );
  return reply.status(200).send({
    success: true,
    message: 'File ingested successfully via worker thread',
    data: {
      originalName: result.originalName,
      totalRows:    result.total,
      processed:    result.processed,
      failed:       result.failed,
      duration:     result.duration,
    },
  });
}

module.exports = { handleUpload };
