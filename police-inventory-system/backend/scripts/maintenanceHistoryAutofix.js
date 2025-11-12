// Run this script with: node scripts/maintenanceHistoryAutofix.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const EquipmentPool = require('../models/EquipmentPool');

const DEFAULT_REASON = 'Legacy repair log (autofix)';
const DEFAULT_DATE = new Date('2020-01-01');

async function fixMaintenanceHistoryField(item, idx) {
  let changed = false;
  if (item.maintenanceHistory && Array.isArray(item.maintenanceHistory)) {
    item.maintenanceHistory.forEach((entry, i) => {
      if (!entry.reason) {
        entry.reason = DEFAULT_REASON;
        changed = true;
        console.log(`  [Fix] Added missing reason for item#${idx} maintenanceHistory[${i}]`);
      }
      if (!entry.reportedDate) {
        entry.reportedDate = DEFAULT_DATE;
        changed = true;
        console.log(`  [Fix] Added missing reportedDate for item#${idx} maintenanceHistory[${i}]`);
      }
    });
  }
  return changed;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const pools = await EquipmentPool.find({});
  let poolsFixed = 0;
  let itemsFixed = 0;
  for (const pool of pools) {
    let poolChanged = false;
    pool.items = pool.items || [];
    pool.items.forEach((item, idx) => {
      if (fixMaintenanceHistoryField(item, idx)) {
        itemsFixed++;
        poolChanged = true;
      }
    });
    if (poolChanged) {
      await pool.save({ validateBeforeSave: false });
      poolsFixed++;
      console.log(`[SAVE] Updated pool: ${pool.poolName} (${pool._id})`);
    }
  }
  console.log(`\nDone. Fixed maintenanceHistory errors in ${itemsFixed} items across ${poolsFixed} pools.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Autofix script error:', err);
  process.exit(1);
});
