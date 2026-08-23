'use strict';

const cluster = require('cluster');
const os = require('os');
const { PORT, IS_DEV } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { buildApp } = require('./src/app');

const NUM_WORKERS = IS_DEV ? Math.min(2, os.cpus().length) : os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[cluster] 🚀 Primary ${process.pid} started`);

  // Clean any leftover temp files from previously interrupted runs
  const tmpDir = require('path').join(__dirname, 'uploads', 'tmp');
  if (require('fs').existsSync(tmpDir)) {
    try {
      for (const file of require('fs').readdirSync(tmpDir)) {
        require('fs').unlinkSync(require('path').join(tmpDir, file));
      }
    } catch (_) {}
  }

  console.log(`[cluster] Spawning ${NUM_WORKERS} worker(s)...`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }


  cluster.on('exit', (worker, code, signal) => {
    console.warn(
      `[cluster] ⚠️  Worker ${worker.process.pid} exited ` +
        `(code: ${code}, signal: ${signal}). Respawning in 1.5s...`
    );
    setTimeout(() => {
      cluster.fork();
    }, 1500);
  });


  process.on('SIGTERM', () => {
    console.log('[cluster] SIGTERM received. Shutting down all workers...');
    for (const worker of Object.values(cluster.workers)) {
      worker.process.kill('SIGTERM');
    }
    process.exit(0);
  });


} else {
  let app;
  let monitorHandle;

  async function start() {
    try {
      await connectDB();
      app = buildApp();
      await app.listen({ port: PORT, host: '0.0.0.0' });
      console.log(`[worker ${process.pid}] ✅ Listening on port ${PORT}`);
      const { startMonitor, stopMonitor } = require('./src/modules/system/monitor.service');
      monitorHandle = startMonitor(app.log);

      const shutdown = async (signal) => {
        app.log.warn(`[worker ${process.pid}] ${signal} received. Shutting down gracefully...`);
        stopMonitor(monitorHandle);
        await app.close();
        process.exit(0);
      };

      process.once('SIGTERM', () => shutdown('SIGTERM'));
      process.once('SIGINT',  () => shutdown('SIGINT'));

    } catch (err) {
      console.error(`[worker ${process.pid}] ❌ Startup failed:`, err.message);
      process.exit(1);
    }
  }

  start();
}
