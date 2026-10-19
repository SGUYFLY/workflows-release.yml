// routes/users.js — จัดการบัญชีพนักงาน (เฉพาะ CEO)
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validEmail } = require('../middleware/security');
const router = express.Router();
const ROLES = ['ceo', 'supervisor', 'store', 'clerk'];

router.use(verifyToken, requireRole(['ceo']));

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, role, email, phone FROM users ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, role, email, password, phone } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'กรุณากรอกชื่อ' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'ตำแหน่งไม่ถูกต้อง' });
    if (!validEmail(email)) return res.status(400).json({ error: 'อีเมลไม่ถูกต้อง' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
    const em = String(email).trim().toLowerCase();
    const dup = await pool.query('SELECT 1 FROM users WHERE email = $1', [em]);
    if (dup.rows[0]) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    const hash = await bcrypt.hash(String(password), 10);
    const ins = await pool.query(
      'INSERT INTO users (name, role, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, role, email, phone',
      [String(name).trim(), role, em, phone || null, hash]);
    res.status(201).json(ins.rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
    const hash = await bcrypt.hash(String(password), 10);
    const r = await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING id', [hash, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ error: 'ลบบัญชีที่กำลังใช้อยู่ไม่ได้' });
    const r = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ error: 'ลบไม่ได้ เพราะบัญชีนี้ผูกกับข้อมูลโครงการ' });
    next(e);
  }
});

module.exports = router;
