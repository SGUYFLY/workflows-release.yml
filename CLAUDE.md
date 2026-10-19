# ไทยโครงสร้าง — บริบทโปรเจกต์ (ทีม AI อ่านไฟล์นี้ก่อนทำงานเสมอ)

ระบบจัดการงานรับเหมาก่อสร้าง: React 18 + Vite (frontend/) · Express + pg (backend/) · PostgreSQL บน Supabase (database/schema.sql, 21 ตาราง)

## ตำแหน่งงานและสิทธิ์ (RBAC)
| role | ทำอะไรได้ |
|---|---|
| ceo | ทุกอย่าง: ดูภาพรวม สร้าง/แก้โครงการ อนุมัติครุภัณฑ์ ดูบัญชี |
| supervisor | ดู/แก้ความคืบหน้าโครงการ ส่งคำขอวัสดุ — สร้างโครงการได้ |
| store | คลังวัสดุ จ่ายวัสดุตามคำขอ ปรับสต็อก — สร้างโครงการไม่ได้ (ต้องได้ 403) |
| clerk | เอกสาร/บิล/ครุภัณฑ์ แจ้งซ่อม — สร้างโครงการไม่ได้ (ต้องได้ 403) |
| ลูกค้า | พอร์ทัลแยก (client_users) เห็นเฉพาะโครงการของตัวเอง |

## คำสั่งที่ใช้ (Windows cmd)
- backend: `cd backend` → `npm run dev` (พอร์ต 8080) · `npm run seed` · **`npm run check`** (ตรวจทั้งระบบ)
- frontend: `cd frontend` → `npm run dev` (5173) · `npm run build`
- ตัวแปร: backend/.env (DATABASE_URL, JWT_SECRET, PORT) · frontend/.env (VITE_API_URL)

## กฎเหล็กของทีม AI
1. ห้ามแสดง/commit ค่าใน backend/.env · ห้ามลบข้อมูลจริงโดยไม่ถามเจ้าของ
2. แก้โค้ดแล้วต้องพิสูจน์ด้วยการรัน (`npm run check`, `npm run build`) ไม่ใช่เดา
3. ข้อมูลเงิน/สต็อกต้องคำนวณด้วยโค้ด ห้ามประมาณ
4. 1 agent = 1 หน้าที่ — งานนอกหน้าที่ให้ส่งต่อ agent ที่รับผิดชอบ
5. ข้อผิดพลาดที่แก้แล้วให้บันทึกลง `library/error-catalog.md` เพื่อให้ทีมเก่งขึ้น
6. รายงานผลเป็นภาษาไทย สั้น ชัด: เจออะไร → แก้อะไร → พิสูจน์ยังไง

## สถานะโมดูล
- ตารางจริงในฐานข้อมูล: ล็อกอิน, ผู้ใช้ (`/api/users`, เฉพาะ CEO), โครงการ (`/api/projects`), ตั้งค่าครั้งแรก (`/api/setup`)
- เก็บเป็นก้อน JSON ต่อหมวดใน `module_state` (`/api/state`): คลังวัสดุ ร้านค้า เอกสาร/บัญชี ทีมช่าง ครุภัณฑ์ คำขอเบิก — สิทธิ์เขียนกำหนดใน `backend/routes/state.js` (WRITE)
- ฐานข้อมูล: ไม่มี `DATABASE_URL` = PGlite ฝังตัว (`DATA_DIR`) · มี = Postgres/Supabase
- พอร์ทัลลูกค้ายังเป็นหน้าตัวอย่าง (แสดงเฉพาะโหมดสาธิตที่มีบัญชี @thai.local)
- แพ็กเกจแจกจ่าย: `desktop/` (Electron), `Dockerfile`, `render.yaml`, `.github/workflows/release.yml`
