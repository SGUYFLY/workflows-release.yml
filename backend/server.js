// server.js — จุดเริ่มต้นของ backend รวมทุก route (และเสิร์ฟหน้าเว็บที่ build แล้วเมื่อมี)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

// JWT_SECRET: ถ้าไม่ได้ตั้งไว้ในโหมดฝังตัว ให้สร้างแล้วเก็บไว้ในโฟลเดอร์ข้อมูล (ไม่ฝังรหัสไว้ในโค้ด)
if (!process.env.JWT_SECRET && pool.mode === 'embedded') {
  const f = path.join(pool.dataDir, 'jwt.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  process.env.JWT_SECRET = fs.readFileSync(f, 'utf8').trim();
}

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', 1); // เมื่ออยู่หลัง reverse proxy (Render, Nginx) เพื่อให้ตัวจำกัดจำนวนครั้งเห็น IP จริง
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, mode: pool.mode, time: new Date().toISOString() }));
app.use('/api/system', require('./routes/system'));
app.use('/api/setup', require('./routes/setup'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/state', require('./routes/state'));
app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ API นี้' }));

// หน้าเว็บ (frontend build) — ใช้ได้ทั้งเว็บออนไลน์และแอปเดสก์ท็อป
const candidates = [process.env.FRONTEND_DIR, path.join(__dirname, 'public'), path.join(__dirname, '..', 'frontend', 'dist')].filter(Boolean);
const webDir = candidates.find((d) => fs.existsSync(path.join(d, 'index.html')));
if (webDir) {
  app.use(express.static(webDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(webDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
});

function start(port = process.env.PORT || 4000, host = process.env.HOST || '0.0.0.0') {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`API running on http://localhost:${server.address().port} (db: ${pool.mode}${webDir ? ', web: ' + webDir : ''})`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) start();
module.exports = { app, start, pool };
