// routes/state.js — เก็บข้อมูลโมดูลที่ยังไม่มีตารางเฉพาะ (คลัง เอกสาร ทีม ผู้ขาย ฯลฯ) เป็นก้อน JSON
// เพื่อให้ข้อมูลไม่หายเมื่อรีเฟรช/ปิดโปรแกรม — ทุกคนในองค์กรเห็นข้อมูลเดียวกัน
const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// ใครเขียนข้อมูลชุดไหนได้ (อ่านได้ทุกคนที่ล็อกอิน เพราะหน้าจอบางส่วนใช้ข้อมูลร่วมกัน)
const WRITE = {
  billing: ['ceo', 'clerk'],
  transactions: ['ceo', 'clerk'],
  team: ['ceo', 'supervisor'],
  subcontractors: ['ceo', 'supervisor'],
  vendors: ['ceo', 'store', 'clerk'],
  warehouses: ['ceo', 'store'],
  materials: ['ceo', 'store'],
  equipment: ['ceo', 'store', 'clerk'],
  equipmentApprovals: ['ceo', 'store', 'clerk'],
  resourceRequests: ['ceo', 'supervisor', 'store'],
};

let ensured;
const ensure = () => (ensured = ensured || pool.query(
  `CREATE TABLE IF NOT EXISTS module_state (
     key text PRIMARY KEY,
     data jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now(),
     updated_by integer
   )`).catch((e) => { ensured = null; throw e; }));

router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    await ensure();
    const { rows } = await pool.query('SELECT key, data FROM module_state');
    const state = {};
    rows.forEach((r) => { state[r.key] = r.data; });
    const d = await pool.query("SELECT count(*)::int AS n FROM users WHERE email LIKE '%@thai.local'");
    res.json({ state, demo: d.rows[0].n > 0 });
  } catch (e) { next(e); }
});

router.put('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!WRITE[key]) return res.status(404).json({ error: 'ไม่รู้จักข้อมูลชุดนี้' });
    if (!WRITE[key].includes(req.user.role)) return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' });
    const data = req.body && req.body.data;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'ข้อมูลต้องเป็นรายการ' });
    await ensure();
    await pool.query(
      `INSERT INTO module_state (key, data, updated_by) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(data), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
