# ทีม AI ของไทยโครงสร้าง (ปรับจากหลัก "AI Team Playbook": 1 งาน = 1 ผู้ช่วย → หัวหน้าทีม → คลังตัวอย่าง)

## STEP 0 แกะ "แผนก" ตามตำแหน่งงานจริงของระบบ
| แผนก (agent) | ตำแหน่งที่เทียบ | ดูแลความผิดพลาดจุดไหน |
|---|---|---|
| lead-thai-structure | เจ้าของโปรเจกต์ | รับคำสั่งเดียว แล้วกระจายงาน |
| env-db-checker | ผู้ดูแลระบบ | .env, Supabase, schema |
| api-rbac-checker | ผู้ดูแลระบบ | API, ล็อกอิน, สิทธิ์ 4 ตำแหน่ง |
| ceo-assistant | CEO | งบ/โครงการ/ภาพรวม |
| supervisor-assistant | หัวหน้างาน | progress, ขั้นงาน, คำขอวัสดุ |
| store-assistant | สโตร์ | สต็อก, การจ่ายวัสดุ |
| clerk-assistant | เสมียน | บิล, เอกสาร, ครุภัณฑ์, คำอ่านเงิน |
| frontend-checker | นักพัฒนาหน้าเว็บ | build, UI, เรียก API |
| qa-reviewer | ผู้ตรวจงาน | ตรวจรอบสุดท้ายทุกครั้ง |

แต่ละตัวมี 4 อย่างครบ: หน้าที่ · อ่านก่อน · ขั้นตอน · ผลลัพธ์ (ดูไฟล์ใน `.claude/agents/`)

## วิธีใช้ (ต้องเปิด Claude Code ในโฟลเดอร์ thai-construction)
```
cd /d %USERPROFILE%\Documents\thai-construction
claude
```
แล้วพิมพ์ภาษาคนได้เลย เช่น
- `ให้ lead-thai-structure ตรวจและแก้ข้อผิดพลาดทั้งระบบ`
- `ให้ store-assistant ตรวจสต็อกวัสดุ`
- `ให้ clerk-assistant ทดสอบการอ่านจำนวนเงินเป็นตัวอักษร`

ตรวจเองโดยไม่ใช้ AI: `cd backend` แล้ว `npm run check`

## คลังตัวอย่าง
`library/error-catalog.md` (ข้อผิดพลาดที่เคยเจอ+วิธีแก้) และ `library/good-examples.md` — ทีมอ่านก่อนทำงาน และเพิ่มของใหม่ทุกครั้งที่แก้เสร็จ ยิ่งใช้ยิ่งเก่ง

## เริ่มยังไงให้ไม่ท่วม
สัปดาห์แรกใช้แค่ `npm run check` + env-db-checker + qa-reviewer ให้คล่องก่อน แล้วค่อยเพิ่มแผนกอื่น
