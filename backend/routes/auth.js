// routes/auth.js — ล็อกอินและออก JWT token
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { limiter } = require('../middleware/security');
const router = express.Router();

router.post('/login', limiter(20), async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email || '')]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
