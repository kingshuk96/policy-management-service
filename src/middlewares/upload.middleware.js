'use strict';

/**
 * Utility for saving a multipart-uploaded file to a temporary directory.
 */

const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tmp');

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx']);

/**
 * Saves the uploaded multipart file to the temp directory.
 */
async function saveUploadedFile(request) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const data = await request.file();

  if (!data) {
    throw Object.assign(new Error('No file uploaded. Send a file under the "file" field.'), {
      statusCode: 400,
    });
  }

  const fileExt = path.extname(data.filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(fileExt)) {
    data.file.resume();
    throw Object.assign(
      new Error(`Invalid file type "${fileExt}". Only .csv and .xlsx are accepted.`),
      { statusCode: 400 }
    );
  }

  const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}${fileExt}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);

  await pipeline(data.file, fs.createWriteStream(filePath));

  return {
    filePath,
    fileType: fileExt.replace('.', ''), // 'csv' | 'xlsx'
    originalName: data.filename,
  };
}

module.exports = { saveUploadedFile };
