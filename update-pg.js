/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  await pool.query(`UPDATE "NaskahDinas" SET "jenisNaskah" = 'SURAT_EDARAN_SEKDA' WHERE "jenisNaskah" = 'SURAT_EDARAN'`);
  console.log('Done pg update');
  process.exit(0);
}
run();
