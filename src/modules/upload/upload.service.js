'use strict';


const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const { MONGO_URI } = require('../../config/env');

const WORKER_PATH = path.join(__dirname, 'upload.worker.js');

/**
 * Spawns a worker thread to process the uploaded file.
 */
function processFile(fileInfo) {
  const { filePath, fileType, originalName } = fileInfo;

  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { filePath, fileType, mongoUri: MONGO_URI },
    });

    const progressLog = [];

    worker.on('message', (msg) => {
      switch (msg.type) {
        case 'progress':
          progressLog.push(msg);
          break;
        case 'batchError':
          break;

        case 'done':
          cleanup(filePath);
          resolve({
            originalName,
            processed: msg.processed,
            failed:    msg.failed,
            total:     msg.total,
            duration:  msg.duration,
          });
          break;

        case 'error':
          cleanup(filePath);
          reject(
            Object.assign(new Error(`Worker error: ${msg.message}`), { statusCode: 500 })
          );
          break;

        default:
          break;
      }
    });

    worker.on('error', (err) => {
      cleanup(filePath);
      reject(Object.assign(err, { statusCode: 500 }));
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        cleanup(filePath);
        reject(
          Object.assign(
            new Error(`Worker exited unexpectedly with code ${code}`),
            { statusCode: 500 }
          )
        );
      }
    });
  });
}

/**
 * Removes the temporary uploaded file from disk.
 */
function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Retry once after a brief delay if Windows has a temporary lock on the file
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}
    }, 500);
  }
}


module.exports = { processFile };
