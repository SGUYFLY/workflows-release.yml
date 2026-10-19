// คัดลอก backend + หน้าเว็บที่ build แล้ว เข้าโฟลเดอร์ desktop/backend เพื่อแพ็กเป็นแอป
// (ไม่คัดลอก .env, data, node_modules)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dest = path.join(root, 'desktop', 'backend');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
const copy = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (s) => !/node_modules|[\\/]\.env$|[\\/]data([\\/]|$)/.test(s) });
for (const f of ['server.js', 'db.js', 'schema.sql']) copy(path.join(root, 'backend', f), path.join(dest, f));
for (const d of ['routes', 'middleware']) copy(path.join(root, 'backend', d), path.join(dest, d));
const dist = path.join(root, 'frontend', 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('ไม่พบ frontend/dist — รัน "npm run build" ในโฟลเดอร์ frontend ก่อน (ตั้ง VITE_API_URL ให้ว่าง)'); process.exit(1); }
copy(dist, path.join(dest, 'public'));
console.log('เตรียมไฟล์แอปเรียบร้อยที่', dest);
