// scripts/seed.js — ใส่ข้อมูลตั้งต้นสำหรับทดสอบ (รันซ้ำได้ ไม่สร้างข้อมูลซ้ำ)
// รัน: npm run seed
// บัญชีทดสอบทั้งหมดใช้รหัสผ่านเดียวกัน (DEMO_PASSWORD ด้านล่าง) — เปลี่ยนก่อนใช้งานจริงเสมอ
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

const DEMO_PASSWORD = 'Demo1234!';

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [
    ['คุณสมชาย (CEO)', 'ceo', '081-000-0001', 'ceo@thai.local'],
    ['คุณวิชัย (หัวหน้างาน)', 'supervisor', '081-000-0002', 'supervisor@thai.local'],
    ['คุณมานี (ฝ่ายสโตร์)', 'store', '081-000-0003', 'store@thai.local'],
    ['คุณสุดา (เสมียน)', 'clerk', '081-000-0004', 'clerk@thai.local'],
  ];
  for (const [name, role, phone, email] of users) {
    await pool.query(
      `INSERT INTO users (name, role, phone, email, password_hash)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      [name, role, phone, email, hash]
    );
  }

  const { rows: existing } = await pool.query('SELECT count(*)::int AS n FROM clients');
  if (existing[0].n === 0) {
    const c = await pool.query(
      `INSERT INTO clients (name, contact) VALUES ($1,$2) RETURNING id`,
      ['บริษัท ตัวอย่าง จำกัด', '02-000-0000']
    );
    const sup = await pool.query(`SELECT id FROM users WHERE email='supervisor@thai.local'`);
    await pool.query(
      `INSERT INTO projects (client_id, supervisor_id, name, status, progress, budget, spent, start_date, end_date)
       VALUES ($1,$2,'อาคารสำนักงาน 3 ชั้น','กำลังก่อสร้าง',45,12000000,5400000,'2026-06-01','2027-03-31'),
              ($1,$2,'โกดังเก็บสินค้า','วางแผน',0,4500000,0,'2026-12-01','2027-05-31')`,
      [c.rows[0].id, sup.rows[0].id]
    );
    await pool.query(`INSERT INTO warehouses (name, is_main) VALUES ('คลังหลัก', true)`);
    await pool.query(
      `INSERT INTO document_types (name, category) VALUES
       ('ใบเสนอราคา','financial'),('ใบแจ้งหนี้','financial'),('สัญญา','contract')`
    );
  }

  const n = await pool.query('SELECT (SELECT count(*) FROM users) u, (SELECT count(*) FROM projects) p');
  console.log('Seed เสร็จสิ้น — users:', n.rows[0].u, 'projects:', n.rows[0].p);
  console.log('ล็อกอินทดสอบ: ceo@thai.local / ' + DEMO_PASSWORD);
  await pool.end();
}

main().catch((e) => { console.error('Seed ล้มเหลว:', e.message); process.exit(1); });
