'use strict';



const { workerData, parentPort } = require('worker_threads');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');


const Agent    = require('../agent/agent.model');
const User     = require('../user/user.model');
const Account  = require('../user/account.model');
const Lob      = require('../policy/lob.model');
const Carrier  = require('../policy/carrier.model');
const Policy   = require('../policy/policy.model');

const BATCH_SIZE = 1000;


function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const csvParser = require('csv-parser');
    const rows = [];
    const stream = fs.createReadStream(filePath);
    stream
      .pipe(csvParser({ trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        stream.destroy();
        resolve(rows);
      })
      .on('error', (err) => {
        stream.destroy();
        reject(err);
      });
  });
}


function parseXlsx(filePath) {
  const xlsx = require('xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

// Batch Processor 
function normalizeRow(row) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.trim().toLowerCase().replace(/[\s_]+/g, ''),
      String(v ?? '').trim(),
    ])
  );

  // Aliases for common alternate column names 
  if (!normalized.agentname && normalized.agent) {
    normalized.agentname = normalized.agent;
  }
 
  if (!normalized.premiumamount && normalized.premiumamountwritten) {
    normalized.premiumamount = normalized.premiumamountwritten;
  }
 
  if (!normalized.usertype && normalized.primary) {
    normalized.usertype = normalized.primary;
  }
  if (!normalized.categoryname && !normalized.lob && normalized.policytype) {
    normalized.categoryname = normalized.policytype;
  }

  return normalized;
}

/**
 * Processes a single batch of rows:
 */
async function processBatch(rows) {
  const normalized = rows.map(normalizeRow);
  const agentNames = [...new Set(normalized.map((r) => r.agentname).filter(Boolean))];

  if (agentNames.length) {
    await Agent.bulkWrite(
      agentNames.map((name) => ({
        updateOne: {
          filter: { name },
          update: { $setOnInsert: { name } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const agentDocs = await Agent.find({ name: { $in: agentNames } }, { name: 1 }).lean();
  const agentMap = new Map(agentDocs.map((a) => [a.name, a._id]));

  const userRows = normalized.filter((r) => r.email);

  if (userRows.length) {
    await User.bulkWrite(
      userRows.map((r) => ({
        updateOne: {
          filter: { email: r.email.toLowerCase() },
          update: {
            $setOnInsert: {
              firstName: r.firstname || r.first_name || '',
              email:     r.email.toLowerCase(),
              dob:       r.dob ? new Date(r.dob) : undefined,
              address:   r.address || '',
              phone:     r.phone || '',
              state:     r.state || '',
              zipCode:   r.zipcode || r.zip_code || r.zip || '',
              gender:    r.gender || undefined,
              userType:  r.usertype || r.user_type || 'Primary',
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const userEmails = [...new Set(userRows.map((r) => r.email.toLowerCase()))];
  const userDocs = await User.find({ email: { $in: userEmails } }, { email: 1 }).lean();
  const userMap = new Map(userDocs.map((u) => [u.email, u._id]));


  const accountRows = normalized.filter((r) => r.accountname && r.email);

  if (accountRows.length) {
    await Account.bulkWrite(
      accountRows.map((r) => ({
        updateOne: {
          filter: { accountName: r.accountname },
          update: {
            $setOnInsert: {
              accountName: r.accountname,
              userId:      userMap.get(r.email.toLowerCase()),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const categoryNames = [...new Set(normalized.map((r) => r.categoryname || r.lob).filter(Boolean))];

  if (categoryNames.length) {
    await Lob.bulkWrite(
      categoryNames.map((categoryName) => ({
        updateOne: {
          filter: { categoryName },
          update: { $setOnInsert: { categoryName } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const lobDocs = await Lob.find({ categoryName: { $in: categoryNames } }, { categoryName: 1 }).lean();
  const lobMap = new Map(lobDocs.map((l) => [l.categoryName, l._id]));

  const companyNames = [...new Set(normalized.map((r) => r.companyname || r.carrier).filter(Boolean))];

  if (companyNames.length) {
    await Carrier.bulkWrite(
      companyNames.map((companyName) => ({
        updateOne: {
          filter: { companyName },
          update: { $setOnInsert: { companyName } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const carrierDocs = await Carrier.find({ companyName: { $in: companyNames } }, { companyName: 1 }).lean();
  const carrierMap = new Map(carrierDocs.map((c) => [c.companyName, c._id]));

  const policyRows = normalized.filter(
    (r) => r.policynumber && r.email && (r.categoryname || r.lob) && (r.companyname || r.carrier)
  );

  if (policyRows.length) {
    await Policy.bulkWrite(
      policyRows.map((r) => {
        const userId    = userMap.get(r.email.toLowerCase());
        const agentId   = agentMap.get(r.agentname);
        const lobId     = lobMap.get(r.categoryname || r.lob);
        const carrierId = carrierMap.get(r.companyname || r.carrier);

        return {
          updateOne: {
            filter: { policyNumber: r.policynumber },
            update: {
              $setOnInsert: {
                policyNumber:    r.policynumber,
                policyStartDate: r.policystartdate ? new Date(r.policystartdate) : new Date(),
                policyEndDate:   r.policyenddate   ? new Date(r.policyenddate)   : new Date(),
                premiumAmount:   parseFloat(r.premiumamount || r.premium || 0),
                userId,
                agentId,
                lobId,
                carrierId,
              },
            },
            upsert: true,
          },
        };
      }),
      { ordered: false }
    );
  }
}



async function run() {
  const { filePath, fileType, mongoUri } = workerData;
  const startTime = Date.now();
  await mongoose.connect(mongoUri);
  const rows = fileType === 'csv' ? await parseCsv(filePath) : parseXlsx(filePath);
  let processed = 0;
  let failed = 0;
  const total = rows.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    try {
      await processBatch(batch);
      processed += batch.length;
    } catch (err) {
      failed += batch.length;
      parentPort.postMessage({
        type: 'batchError',
        batchIndex: i,
        message: err.message,
      });
    }

    parentPort.postMessage({ type: 'progress', processed, failed, total });

    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  await mongoose.disconnect();

  parentPort.postMessage({
    type: 'done',
    processed,
    failed,
    total,
    duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
  });
}

run().catch((err) => {
  parentPort.postMessage({ type: 'error', message: err.message });
  process.exit(1);
});
