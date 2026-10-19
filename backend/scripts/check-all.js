// scripts/check-all.js — ตรวจความผิดพลาดทั้งระบบ: ตั้งค่า / ฐานข้อมูล / ข้อมูล / API+สิทธิ์
// ใช้: npm run check   (ตัวเลือก: API_BASE=http://localhost:8080)
require('dotenv').config();
const pool = require('../db');
const API = process.env.API_BASE || `http://localhost:${process.env.PORT || 8080}`;
const results = [];
const add = (area, level, msg) => results.push({ area, level, msg });
const ok = (a, m) => add(a, 'OK', m), warn = (a, m) => add(a, 'WARN', m), bad = (a, m) => add(a, 'ERROR', m);

async function q(sql, p) { return (await pool.query(sql, p)).rows; }

async function checkEnv() {
  if (!process.env.DATABASE_URL) bad('ตั้งค่า', 'ไม่มี DATABASE_URL ใน .env'); else ok('ตั้งค่า', 'พบ DATABASE_URL');
  const js = process.env.JWT_SECRET;
  if (!js) bad('ตั้งค่า', 'ไม่มี JWT_SECRET'); else if (js.length < 32) warn('ตั้งค่า', 'JWT_SECRET สั้นเกินไป (ควร ≥ 32 ตัวอักษร)'); else ok('ตั้งค่า', 'JWT_SECRET ใช้ได้');
}

async function checkDb() {
  try {
    const t = await q(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`);
    t[0].n >= 20 ? ok('ฐานข้อมูล', `เชื่อมต่อได้ มี ${t[0].n} ตาราง`) : bad('ฐานข้อมูล', `ตารางไม่ครบ (${t[0].n}/20+) — รัน schema.sql ใหม่`);
  } catch (e) { bad('ฐานข้อมูล', 'เชื่อมต่อไม่ได้: ' + e.message); return false; }
  return true;
}

async function checkData() {
  const rules = [
    ['CEO/โครงการ', 'โครงการที่ใช้จ่ายเกินงบ', `SELECT id,name FROM projects WHERE spent > budget`, 'warn'],
    ['CEO/โครงการ', 'โครงการวันสิ้นสุดก่อนวันเริ่ม', `SELECT id,name FROM projects WHERE end_date < start_date`, 'bad'],
    ['CEO/โครงการ', 'โครงการเสร็จสิ้นแต่ progress ไม่ถึง 100', `SELECT id,name FROM projects WHERE status='เสร็จสิ้น' AND progress<100`, 'bad'],
    ['CEO/โครงการ', 'โครงการไม่มีหัวหน้างาน', `SELECT id,name FROM projects WHERE supervisor_id IS NULL`, 'warn'],
    ['หัวหน้างาน', 'โครงการวางแผนแต่ progress > 0', `SELECT id,name FROM projects WHERE status='วางแผน' AND progress>0`, 'warn'],
    ['หัวหน้างาน', 'คำขอวัสดุที่ไม่มีรายการ', `SELECT r.id FROM resource_requests r LEFT JOIN request_items i ON i.request_id=r.id WHERE i.id IS NULL`, 'warn'],
    ['สโตร์', 'สต็อกติดลบ', `SELECT warehouse_id,material_id,quantity FROM warehouse_stock WHERE quantity<0`, 'bad'],
    ['สโตร์', 'วัสดุต่ำกว่าจุดสั่งซื้อขั้นต่ำ', `SELECT m.id,m.name FROM materials m JOIN (SELECT material_id, sum(quantity) q FROM warehouse_stock GROUP BY 1) s ON s.material_id=m.id WHERE s.q<m.min_stock_level`, 'warn'],
    ['สโตร์', 'คำขอ "จ่ายแล้ว" แต่ไม่มีการเคลื่อนไหวสต็อก (out)', `SELECT r.id FROM resource_requests r WHERE r.status='จ่ายแล้ว' AND NOT EXISTS (SELECT 1 FROM stock_movements s WHERE s.request_id=r.id AND s.movement_type='out')`, 'bad'],
    ['เสมียน', 'เอกสารยอดรวมไม่ตรงกับรายการย่อย', `SELECT d.id,d.doc_number FROM documents d JOIN (SELECT document_id, sum(quantity*unit_price) t FROM document_items GROUP BY 1) i ON i.document_id=d.id WHERE abs(d.amount - i.t) > 0.01`, 'bad'],
    ['เสมียน', 'ใบแจ้งหนี้เกินกำหนดแต่สถานะยังไม่ใช่ "เกินกำหนด/ชำระแล้ว"', `SELECT id,doc_number FROM documents WHERE due_date < CURRENT_DATE AND status IN ('ร่าง','ส่งแล้ว','อนุมัติแล้ว')`, 'warn'],
    ['เสมียน', 'ครุภัณฑ์ส่งซ่อมที่ไม่มีคำขออนุมัติรออยู่', `SELECT e.id,e.name FROM equipment e WHERE e.condition_status='ส่งซ่อม' AND NOT EXISTS (SELECT 1 FROM equipment_approvals a WHERE a.equipment_id=e.id AND a.status='รออนุมัติ')`, 'warn'],
    ['ผู้ใช้', 'ผู้ใช้ role ไม่ถูกต้อง', `SELECT id,email,role FROM users WHERE role NOT IN ('ceo','supervisor','store','clerk')`, 'bad'],
  ];
  for (const [area, title, sql, lvl] of rules) {
    try {
      const rows = await q(sql);
      if (!rows.length) ok(area, `ผ่าน: ${title} (0 รายการ)`);
      else add(area, lvl === 'bad' ? 'ERROR' : 'WARN', `${title}: ${rows.length} รายการ → ${JSON.stringify(rows.slice(0, 3))}`);
    } catch (e) { warn(area, `ตรวจ "${title}" ไม่ได้: ${e.message}`); }
  }
}

async function call(path, method = 'GET', token, body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

async function checkApi() {
  try { const h = await call('/api/health'); h.status === 200 ? ok('API', `backend ตอบที่ ${API}`) : bad('API', 'health ตอบ ' + h.status); }
  catch { warn('API', `เชื่อม backend ที่ ${API} ไม่ได้ — เปิด npm run dev ก่อนเพื่อตรวจส่วนนี้`); return; }
  const tokens = {};
  for (const r of ['ceo', 'supervisor', 'store', 'clerk']) {
    const l = await call('/api/auth/login', 'POST', null, { email: `${r}@thai.local`, password: 'Demo1234!' });
    if (l.status === 200 && l.data.user && l.data.user.role === r) { tokens[r] = l.data.token; ok('API/สิทธิ์', `ล็อกอิน ${r} ได้และ role ถูกต้อง`); }
    else warn('API/สิทธิ์', `ล็อกอิน ${r}@thai.local ไม่ได้ (${l.status}) — รัน npm run seed หรือเปลี่ยนรหัสผ่านแล้ว`);
  }
  const noTok = await call('/api/projects'); noTok.status === 401 ? ok('API/สิทธิ์', 'ไม่มี token → 401 ถูกต้อง') : bad('API/สิทธิ์', `ไม่มี token แต่ได้ ${noTok.status} (ช่องโหว่!)`);
  for (const r of Object.keys(tokens)) {
    const g = await call('/api/projects', 'GET', tokens[r]); g.status === 200 ? ok('API/โครงการ', `${r} ดูโครงการได้`) : bad('API/โครงการ', `${r} ดูโครงการไม่ได้ (${g.status})`);
    if (['store', 'clerk'].includes(r)) {
      const p = await call('/api/projects', 'POST', tokens[r], { name: '__rbac_test__', client: '__t__' });
      p.status === 403 ? ok('API/สิทธิ์', `${r} สร้างโครงการ → 403 ถูกต้อง`) : bad('API/สิทธิ์', `${r} สร้างโครงการได้ (${p.status}) — RBAC รั่ว!`);
    }
  }
}

(async () => {
  if (pool.mode === 'embedded') {
    // โหมดฝังตัว: ฐานข้อมูลถูกเปิดโดยเซิร์ฟเวอร์อยู่แล้ว จึงตรวจผ่าน API เท่านั้น (ไม่เปิดไฟล์ซ้ำ)
    ok('ตั้งค่า', 'โหมดฐานข้อมูลฝังตัว (ไม่ต้องใช้ DATABASE_URL)');
    const h = await call('/api/health'); h.status === 200 ? ok('API', `backend ตอบที่ ${API}`) : bad('API', `backend ไม่ตอบที่ ${API}`);
    const st = await call('/api/setup/status'); st.status === 200 ? ok('API', st.data.needsSetup ? 'ยังไม่มีผู้ใช้ — รอตั้งค่าบัญชีแรกที่หน้าเว็บ' : 'มีบัญชีผู้ใช้แล้ว') : bad('API', 'setup/status ผิดพลาด');
    const noTok = await call('/api/projects'); noTok.status === 401 ? ok('API/สิทธิ์', 'ไม่มี token → 401 ถูกต้อง') : bad('API/สิทธิ์', `ไม่มี token แต่ได้ ${noTok.status}`);
    const c = (l) => results.filter((r) => r.level === l).length;
    results.forEach((r) => console.log(`  ${{ OK: '✅', WARN: '⚠️ ', ERROR: '❌' }[r.level]} ${r.msg}`));
    console.log(`\nสรุป: ผ่าน ${c('OK')} · เตือน ${c('WARN')} · ผิดพลาด ${c('ERROR')}`);
    process.exit(c('ERROR') ? 1 : 0);
  }
  await checkEnv();
  if (await checkDb()) await checkData();
  await checkApi();
  const icon = { OK: '✅', WARN: '⚠️ ', ERROR: '❌' };
  let area = '';
  for (const r of results) { if (r.area !== area) { area = r.area; console.log(`\n[${area}]`); } console.log(`  ${icon[r.level]} ${r.msg}`); }
  const c = (l) => results.filter((r) => r.level === l).length;
  console.log(`\nสรุป: ผ่าน ${c('OK')} · เตือน ${c('WARN')} · ผิดพลาด ${c('ERROR')}`);
  await pool.end();
  process.exit(c('ERROR') ? 1 : 0);
})();
