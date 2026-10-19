# คลังข้อผิดพลาดที่เคยเจอ (ทีม AI อ่านก่อนแก้ — และเพิ่มข้อใหม่ทุกครั้งที่แก้เสร็จ)

| อาการ | สาเหตุ | วิธีแก้ที่พิสูจน์แล้ว | ตำแหน่ง |
|---|---|---|---|
| `EADDRINUSE :::4000` | backend ตัวเก่ายังรันอยู่ | `netstat -ano \| findstr :4000` → `taskkill /PID <เลข> /F` หรือเปลี่ยน PORT=8080 | env-db-checker |
| `Missing script: "dev"/"seed"` | รัน npm ผิดโฟลเดอร์ | `cd /d` เข้า backend หรือ frontend ให้ถูกก่อน | env-db-checker |
| `ไม่พบ token` ที่ /api/projects | เรียกโดยไม่ส่ง Authorization | ล็อกอินก่อน ส่ง `Authorization: Bearer <token>` | api-rbac-checker |
| `Cannot GET /` | backend ไม่มีหน้า root | ปกติ — ใช้ /api/health | api-rbac-checker |
| เชื่อม Supabase ไม่ได้ (ENOTFOUND/SSL) | ใช้ direct host (IPv6) หรือไม่เปิด SSL | ใช้ Transaction pooler :6543 และ ssl rejectUnauthorized:false | env-db-checker |
| cd ภาษาไทยใน cmd ไม่ได้ / ชื่อโฟลเดอร์เพี้ยน | cmd + zip ภาษาไทย | ใช้ชื่อ ASCII เช่น thai-construction | env-db-checker |
| `$HOME` ใช้ไม่ได้ | cmd ไม่ใช่ bash | ใช้ `%USERPROFILE%` และ `cd /d` | env-db-checker |
| โครงการ POST ล้มเหลว (client_id ว่าง) | route เก่ารับ client_id แต่หน้าเว็บส่งชื่อ | route ใหม่รับ `client` เป็นชื่อ แล้ว find-or-create | api-rbac-checker |
| ตัวเลขเงินเป็นสตริง ("12000000.00") | pg คืน NUMERIC เป็น string | cast `::float8` ใน SQL | api-rbac-checker |
| วันที่เลื่อนเป็นวันก่อนหน้า | Date → ISO แปลง timezone | `to_char(date,'YYYY-MM-DD')` ใน SQL | api-rbac-checker |
| Supabase แจ้ง "Leave site?" | SQL snippet ยังไม่เซฟ | คลิกในแถบเมนูแทนพิมพ์ URL | env-db-checker |
