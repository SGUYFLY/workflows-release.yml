// routes/assistant.js — ผู้ช่วยในแอป: ตรวจสุขภาพระบบ, เก็บบันทึกข้อผิดพลาด, สร้างรายงาน, แก้ไขอัตโนมัติเฉพาะที่ปลอดภัย
// ไม่เรียกบริการ AI ภายนอก ทำงานได้แม้ออฟไลน์ และไม่ส่งข้อมูลออกจากเครื่อง/เซิร์ฟเวอร์ของคุณ
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { limiter } = require('../middleware/security');
const router = express.Router();

router.use(verifyToken);

let ensured;
const ensure = () => (ensured = ensured || pool.query(
  `CREATE TABLE IF NOT EXISTS error_log (
     id serial PRIMARY KEY,
     created_at timestamptz NOT NULL DEFAULT now(),
     source text,
     user_id integer,
     view text,
     message text,
     detail text
   )`).catch((e) => { ensured = null; throw e; }));

const cut = (v, n) => String(v == null ? '' : v).slice(0, n);

// ---- บันทึกข้อผิดพลาดจากหน้าจอ ----
router.post('/errors', limiter(30), async (req, res, next) => {
  try {
    await ensure();
    const { message, detail, view } = req.body || {};
    if (!message) return res.status(400).json({ error: 'ไม่มีข้อความข้อผิดพลาด' });
    await pool.query(
      'INSERT INTO error_log (source, user_id, view, message, detail) VALUES ($1,$2,$3,$4,$5)',
      ['frontend', req.user.id || null, cut(view, 60), cut(message, 500), cut(detail, 3000)]);
    await pool.query('DELETE FROM error_log WHERE id NOT IN (SELECT id FROM error_log ORDER BY id DESC LIMIT 200)');
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// ---- ตรวจสุขภาพระบบ ----
const REQUIRED_TABLES = ['users', 'projects', 'module_state'];
const backupDir = () => path.join(pool.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'backups');

function listBackups() {
  try {
    return fs.readdirSync(backupDir()).filter((f) => f.endsWith('.tar.gz')).sort().reverse()
      .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir(), f)).mtimeMs }));
  } catch { return []; }
}

async function runChecks(req) {
  const checks = [];
  const add = (id, label, status, detail, advice, fix) => checks.push({ id, label, status, detail, advice: advice || '', fix: fix || null });

  // 1) ฐานข้อมูลตอบสนอง
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; add('db', 'เชื่อมต่อฐานข้อมูล', 'ok', pool.mode === 'embedded' ? 'ฐานข้อมูลในเครื่อง (ฝังตัว)' : 'PostgreSQL / Supabase'); }
  catch (e) {
    add('db', 'เชื่อมต่อฐานข้อมูล', 'fail', cut(e.message, 200),
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/.test(e.message)
        ? 'ค่า DATABASE_URL ไม่ถูกต้องหรือเข้าถึงไม่ได้ ให้ใช้สตริงแบบ Transaction pooler จาก Supabase และตรวจว่ารหัสผ่านไม่มีอักขระพิเศษ'
        : 'ตรวจ DATABASE_URL และสถานะโปรเจกต์ Supabase');
  }
  if (dbOk) {
    // 2) ตารางที่จำเป็น
    try {
      const missing = [];
      for (const t of REQUIRED_TABLES) {
        const r = await pool.query('SELECT to_regclass($1) AS t', ['public.' + t]);
        if (!r.rows[0].t) missing.push(t);
      }
      if (missing.length) add('tables', 'โครงสร้างตาราง', 'fail', 'ไม่พบตาราง: ' + missing.join(', '), 'รัน schema.sql ในฐานข้อมูล (Supabase → SQL Editor) หรือรีสตาร์ตแอป');
      else add('tables', 'โครงสร้างตาราง', 'ok', 'ครบทั้ง ' + REQUIRED_TABLES.length + ' ตารางหลัก');
    } catch (e) { add('tables', 'โครงสร้างตาราง', 'fail', cut(e.message, 200)); }
    // 3) บัญชีผู้ใช้
    try {
      const r = await pool.query("SELECT count(*)::int AS n, count(*) FILTER (WHERE role='ceo')::int AS ceo FROM users");
      const { n, ceo } = r.rows[0];
      if (!n) add('users', 'บัญชีผู้ใช้', 'fail', 'ยังไม่มีผู้ใช้', 'เปิดหน้าล็อกอินเพื่อสร้างบัญชีแรก');
      else if (!ceo) add('users', 'บัญชีผู้ใช้', 'warn', `มี ${n} บัญชี แต่ไม่มี CEO`, 'ต้องมี CEO อย่างน้อย 1 คนเพื่อจัดการผู้ใช้');
      else add('users', 'บัญชีผู้ใช้', 'ok', `${n} บัญชี (CEO ${ceo})`);
    } catch (e) { add('users', 'บัญชีผู้ใช้', 'warn', cut(e.message, 200)); }
    // 4) ข้อมูลโมดูล
    try {
      const r = await pool.query('SELECT count(*)::int AS n FROM module_state');
      add('modules', 'ข้อมูลโมดูล (คลัง เอกสาร ทีม)', 'ok', `บันทึกไว้ ${r.rows[0].n} ชุด`);
    } catch (e) { add('modules', 'ข้อมูลโมดูล', 'warn', cut(e.message, 200), 'ข้อมูลโมดูลอาจไม่ถูกบันทึก ลองรีสตาร์ตแอป'); }
  }

  // 5) ความลับสำหรับออก token
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 16) add('jwt', 'JWT_SECRET', 'warn', 'สั้นเกินไป', 'ตั้ง JWT_SECRET เป็นสตริงสุ่มอย่างน้อย 32 ตัวอักษร');
  else add('jwt', 'JWT_SECRET', 'ok', 'ตั้งค่าแล้ว');

  // 6) พื้นที่เก็บข้อมูลและสำรอง (โหมดฝังตัว)
  if (pool.mode === 'embedded') {
    try {
      const probe = path.join(pool.dataDir, '.write-test');
      fs.writeFileSync(probe, 'ok'); fs.unlinkSync(probe);
      add('disk', 'โฟลเดอร์เก็บข้อมูล', 'ok', 'เขียนไฟล์ได้');
    } catch (e) { add('disk', 'โฟลเดอร์เก็บข้อมูล', 'fail', cut(e.message, 200), 'ตรวจสิทธิ์และพื้นที่ว่างของโฟลเดอร์ข้อมูล'); }
    const b = listBackups();
    if (!b.length) add('backup', 'ไฟล์สำรองข้อมูล', 'warn', 'ยังไม่เคยสำรองข้อมูล', 'สำรองข้อมูลตอนนี้', 'backup_now');
    else {
      const days = Math.floor((Date.now() - b[0].time) / 86400000);
      if (days > 7) add('backup', 'ไฟล์สำรองข้อมูล', 'warn', `สำรองล่าสุดเมื่อ ${days} วันก่อน`, 'ควรสำรองข้อมูลทุกสัปดาห์', 'backup_now');
      else add('backup', 'ไฟล์สำรองข้อมูล', 'ok', `ล่าสุด ${days === 0 ? 'วันนี้' : days + ' วันก่อน'} (${b.length} ไฟล์)`);
    }
  } else {
    add('backup', 'การสำรองข้อมูล', 'ok', 'ใช้ระบบสำรองของ Supabase', 'ตรวจที่ Supabase → Database → Backups');
  }

  // 7) การตั้งค่าหลัง proxy
  if (req.headers['x-forwarded-for'] && !process.env.TRUST_PROXY) {
    add('proxy', 'การตั้งค่า proxy', 'warn', 'อยู่หลัง proxy แต่ไม่ได้ตั้ง TRUST_PROXY', 'ตั้ง TRUST_PROXY=1 เพื่อให้ตัวจำกัดจำนวนครั้งเห็น IP จริง');
  }

  // 8) ข้อผิดพลาดล่าสุดจากหน้าจอ
  if (dbOk) {
    try {
      await ensure();
      const r = await pool.query("SELECT count(*)::int AS n FROM error_log WHERE created_at > now() - interval '24 hours'");
      const n = r.rows[0].n;
      if (n) add('errors', 'ข้อผิดพลาดใน 24 ชั่วโมง', 'warn', `พบ ${n} รายการ`, 'ดูรายละเอียดในรายงาน แล้วส่งรายงานให้ผู้พัฒนา');
      else add('errors', 'ข้อผิดพลาดใน 24 ชั่วโมง', 'ok', 'ไม่พบ');
    } catch (e) { add('errors', 'บันทึกข้อผิดพลาด', 'warn', cut(e.message, 200)); }
  }
  return checks;
}

router.get('/health', async (req, res, next) => {
  try { res.json({ checks: await runChecks(req) }); } catch (e) { next(e); }
});

// ---- รายงานสำหรับส่งต่อให้ผู้พัฒนา (ไม่มีรหัสผ่าน/ความลับ) ----
router.get('/report', async (req, res, next) => {
  try {
    const checks = await runChecks(req);
    let errors = [];
    try {
      await ensure();
      errors = (await pool.query('SELECT id, created_at, source, view, message, detail FROM error_log ORDER BY id DESC LIMIT 30')).rows;
    } catch {}
    let version = '';
    try { version = require('../package.json').version; } catch {}
    res.json({
      generatedAt: new Date().toISOString(),
      app: { version, dbMode: pool.mode, node: process.version, platform: `${os.platform()} ${os.release()}`, uptimeMin: Math.round(process.uptime() / 60) },
      user: { role: req.user.role },
      checks, errors,
    });
  } catch (e) { next(e); }
});

// ---- แก้ไขอัตโนมัติ (เฉพาะ CEO, เฉพาะการกระทำที่ปลอดภัย) ----
router.post('/fix', requireRole(['ceo']), async (req, res, next) => {
  try {
    const { id } = req.body || {};
    if (id === 'backup_now') {
      if (pool.mode !== 'embedded') return res.status(400).json({ error: 'โหมดนี้ใช้ระบบสำรองของ Supabase' });
      fs.mkdirSync(backupDir(), { recursive: true });
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      const dest = path.join(backupDir(), `backup-${stamp}.tar.gz`);
      await pool.backup(dest);
      for (const old of listBackups().slice(10)) { try { fs.unlinkSync(path.join(backupDir(), old.name)); } catch {} }
      return res.json({ ok: true, message: 'สำรองข้อมูลแล้ว', file: path.basename(dest) });
    }
    if (id === 'clear_errors') {
      await ensure();
      await pool.query('DELETE FROM error_log');
      return res.json({ ok: true, message: 'ล้างบันทึกข้อผิดพลาดแล้ว' });
    }
    res.status(400).json({ error: 'ไม่รู้จักการแก้ไขนี้' });
  } catch (e) { next(e); }
});

module.exports = router;
