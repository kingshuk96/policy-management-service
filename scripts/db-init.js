'use strict';


require('dotenv').config();

const mongoose = require('mongoose');
const { MONGO_URI } = require('../src/config/env');
const { initializeDatabase } = require('../src/database/init');

async function run() {
  console.log('\n🔌 [db:init] Connecting to MongoDB...');

  await mongoose.connect(MONGO_URI);
  console.log(`✅ [db:init] Connected: ${mongoose.connection.host}\n`);

  const report = await initializeDatabase(console);

  if (report.failed.length > 0) {
    console.error(`\n❌ [db:init] ${report.failed.length} collection(s) failed to initialize.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n🎉 [db:init] Database initialization complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ [db:init] Fatal error:', err.message);
  process.exit(1);
});
