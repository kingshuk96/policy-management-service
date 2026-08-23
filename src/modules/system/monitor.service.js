'use strict';

/**
 * Real-time CPU usage monitor for worker processes.
 */

const osUtils = require('os-utils');
const { CPU_THRESHOLD } = require('../../config/env');

const POLL_INTERVAL_MS = 2000; 

/**
 * Starts the CPU monitor on the current worker process.
 */
function startMonitor(logger = console, options = {}) {
  const isTest = process.env.NODE_ENV === 'test';
  const { warmupMs = isTest ? 0 : 4000 } = options;
  const startTime = Date.now();

  const log = {
    info:  (msg) => (logger.info  ? logger.info(msg)  : console.log(msg)),
    warn:  (msg) => (logger.warn  ? logger.warn(msg)  : console.warn(msg)),
    error: (msg) => (logger.error ? logger.error(msg) : console.error(msg)),
  };

  log.info(
    `[monitor]  CPU monitor started — ` +
      `threshold: ${CPU_THRESHOLD}% | interval: ${POLL_INTERVAL_MS}ms | pid: ${process.pid}`
  );

  const intervalId = setInterval(() => {
    osUtils.cpuUsage((cpuFraction) => {
      const cpuPercent = (cpuFraction * 100).toFixed(2);

      log.info(`[monitor] CPU usage: ${cpuPercent}% (pid: ${process.pid})`);

      if (parseFloat(cpuPercent) >= CPU_THRESHOLD) {
       
        if (Date.now() - startTime < warmupMs) {
          log.warn(
            `[monitor] ⚠️  CPU ${cpuPercent}% is at/above threshold during startup warmup window (${warmupMs}ms). Allowing initialization to settle...`
          );
          return;
        }

        log.warn(
          `[monitor] CRITICAL — CPU ${cpuPercent}% has reached or exceeded the ` +
            `${CPU_THRESHOLD}% threshold. Initiating graceful worker restart...`
        );

        clearInterval(intervalId);

        process.exit(1);
      }
    });
  }, POLL_INTERVAL_MS);

  intervalId.unref();

  return intervalId;
}

/**
 * Stops the CPU monitor interval.
 */
function stopMonitor(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[monitor]  CPU monitor stopped');
  }
}

module.exports = { startMonitor, stopMonitor };
