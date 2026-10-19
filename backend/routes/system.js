// routes/system.js — ตรวจสอบสถานะระบบและการเชื่อมต่อฐานข้อมูล (ไม่ต้องล็อกอิน, ไม่เปิดเผยข้อมูลลับ)
const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/db-check', async (req, res) => {
  try {
    const t = await pool.query(
      "select count(*)::int as n from information_schema.tables where table_schema='public'"
    );
    const u = await pool.query('select count(*)::int as n from users');
    const p = await pool.query('select count(*)::int as n from projects');
    res.json({ ok: true, tables: t.rows[0].n, users: u.rows[0].n, projects: p.rows[0].n });
  } catch (err) {
    console.error('db-check failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
