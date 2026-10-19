// db.js — จุดเชื่อมต่อฐานข้อมูลกลาง
//  • มี DATABASE_URL  -> ใช้ PostgreSQL ภายนอก (เช่น Supabase) ตามเดิม
//  • ไม่มี            -> ใช้ฐานข้อมูล Postgres ฝังในตัวแอป (PGlite) เก็บไฟล์ใน DATA_DIR
//    ทำให้แอปที่แจกจ่ายรันได้เองโดยไม่ต้องติดตั้งหรือสมัครบริการฐานข้อมูล
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const remote = !!process.env.DATABASE_URL;
let pool;

if (remote) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
  pool.on('error', (err) => console.error('Unexpected database error', err));
  pool.mode = 'postgres';
} else {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  let db;
  let ready;
  const init = () => (ready = ready || (async () => {
    const { PGlite } = await import('@electric-sql/pglite');
    const pgdata = path.join(dataDir, 'pgdata');
    const restoreFile = path.join(dataDir, 'restore.tar.gz');
    if (fs.existsSync(restoreFile)) {
      // กู้คืนจากไฟล์สำรอง: แทนที่ฐานข้อมูลปัจจุบันด้วยข้อมูลในไฟล์ (ฐานข้อมูลเดิมถูกย้ายไว้เป็น pgdata.before-restore)
      if (fs.existsSync(pgdata)) { fs.rmSync(pgdata + '.before-restore', { recursive: true, force: true }); fs.renameSync(pgdata, pgdata + '.before-restore'); }
      db = new PGlite(pgdata, { loadDataDir: new Blob([fs.readFileSync(restoreFile)]) });
      fs.renameSync(restoreFile, restoreFile + '.done');
      console.log('กู้คืนข้อมูลจากไฟล์สำรองแล้ว');
    } else {
      db = new PGlite(pgdata);
    }
    await db.waitReady;
    const t = await db.query("select to_regclass('public.users') as t");
    if (!t.rows[0].t) {
      await db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
      console.log('สร้างฐานข้อมูลใหม่เรียบร้อย ที่', dataDir);
    }
  })());
  pool = {
    mode: 'embedded',
    dataDir,
    query: async (text, params) => { await init(); return db.query(text, params); },
    backup: async (dest) => { await init(); const f = await db.dumpDataDir('gzip'); fs.writeFileSync(dest, Buffer.from(await f.arrayBuffer())); },
    end: async () => { if (ready) { await ready; await db.close(); } },
  };
}

module.exports = pool;
