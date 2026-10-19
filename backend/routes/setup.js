// routes/setup.js — ตั้งค่าครั้งแรก: สร้างบัญชี CEO คนแรกเมื่อยังไม่มีผู้ใช้เลย
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { limiter, validEmail } = require('../middleware/security');
const router = express.Router();

router.get('/status', async (req, res, next) => {
  try {
    const u = await pool.query('SELECT count(*)::int AS n FROM users');
    const d = await pool.query("SELECT count(*)::int AS n FROM users WHERE email LIKE '%@thai.local'");
    res.json({ needsSetup: u.rows[0].n === 0, demo: d.rows[0].n > 0, mode: pool.mode });
  } catch (e) { next(e); }
});

router.post('/', limiter(10), async (req, res, next) => {
  try {
    const u = await pool.query('SELECT count(*)::int AS n FROM users');
    if (u.rows[0].n > 0) return res.status(409).json({ error: 'ระบบถูกตั้งค่าแล้ว' });
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
    if (!validEmail(email)) return res.status(400).json({ error: 'อีเมลไม่ถูกต้อง' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
    const hash = await bcrypt.hash(String(password), 10);
    await pool.query(`INSERT INTO users (name, role, email, password_hash) VALUES ($1,'ceo',$2,$3)`, [String(name).trim(), String(email).trim().toLowerCase(), hash]);
    const w = await pool.query('SELECT count(*)::int AS n FROM warehouses');
    if (w.rows[0].n === 0) await pool.query(`INSERT INTO warehouses (name, is_main) VALUES ('คลังหลัก', true)`);
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
