-- ============================================================
-- ไทยโครงสร้าง — ระบบจัดการรับเหมาก่อสร้าง
-- Database Schema (PostgreSQL 14+)
-- แปลงตรงจาก ER Diagram ที่ออกแบบไว้ในเอกสารประกอบโครงงาน
-- ============================================================

-- เปิดใช้ extension สำหรับ UUID (ทางเลือก — ถ้าอยากใช้ UUID แทน SERIAL)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. ผู้ใช้งานและลูกค้า
-- ------------------------------------------------------------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('ceo', 'supervisor', 'store', 'clerk')),
  phone         VARCHAR(20),
  email         VARCHAR(150) UNIQUE,
  password_hash TEXT NOT NULL,           -- ใช้ bcrypt หรือ argon2 เข้ารหัส ห้ามเก็บ plaintext เด็ดขาด
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  contact    VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- บัญชีล็อกอินฝั่งลูกค้า แยกจาก users เพราะเป็นคนละ trust boundary
CREATE TABLE client_users (
  id            SERIAL PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. โครงการและทรัพยากร
-- ------------------------------------------------------------

CREATE TABLE projects (
  id             SERIAL PRIMARY KEY,
  client_id      INTEGER NOT NULL REFERENCES clients(id),
  supervisor_id  INTEGER REFERENCES users(id),
  name           VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'วางแผน'
                   CHECK (status IN ('วางแผน', 'กำลังก่อสร้าง', 'ตรวจรับงาน', 'เสร็จสิ้น')),
  progress       SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget         NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent          NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date     DATE,
  end_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_phases (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name       VARCHAR(150) NOT NULL,
  phase_order      SMALLINT NOT NULL,
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE TABLE workers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  role       VARCHAR(50) NOT NULL,        -- เช่น ช่างปูน, ช่างไฟฟ้า, แรงงานทั่วไป
  wage_per_day NUMERIC(10,2) NOT NULL DEFAULT 0,
  phone      VARCHAR(20),
  status     VARCHAR(20) NOT NULL DEFAULT 'ว่าง' CHECK (status IN ('ทำงาน', 'ว่าง', 'ลา'))
);

CREATE TABLE project_assignments (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_id  INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date   DATE,
  UNIQUE (project_id, worker_id, start_date)
);

-- ผู้รับเหมาเฉพาะทาง (subcontractors) — แยกจาก workers เพราะว่าจ้างเป็นรายสัญญาต่องาน
-- ไม่ใช่แรงงานรายวันของบริษัท "specialty" ใช้ค่าจากรายการควบคุมฝั่ง frontend
-- (SPECIALTIES) เพื่อป้องกันชื่อสาขาซ้ำซ้อนกัน เช่น "ไฟฟ้า" vs "ช่างไฟ"
CREATE TABLE subcontractors (
  id              SERIAL PRIMARY KEY,
  specialty       VARCHAR(50) NOT NULL,
  company_name    VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(150),
  phone           VARCHAR(20),
  project_id      INTEGER REFERENCES projects(id),
  contract_value  NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'รอเริ่มงาน'
                    CHECK (status IN ('รอเริ่มงาน', 'กำลังทำงาน', 'เสร็จสิ้น'))
);

CREATE TABLE resource_requests (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by  INTEGER NOT NULL REFERENCES users(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'รอดำเนินการ'
                  CHECK (status IN ('รอดำเนินการ', 'จ่ายแล้ว', 'ยกเลิก')),
  needed_date   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. คลังวัสดุสิ้นเปลือง (แยกจากครุภัณฑ์ตามการออกแบบ)
-- ------------------------------------------------------------

CREATE TABLE warehouses (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(150) NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE materials (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  category        VARCHAR(100),
  unit            VARCHAR(30) NOT NULL,
  price_per_unit  NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_stock_level NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ยอดคงเหลือแยกตามคลัง (ทำให้วัสดุชนิดเดียวกันอยู่ได้หลายคลังพร้อมกัน)
CREATE TABLE warehouse_stock (
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity     NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, material_id)
);

CREATE TABLE request_items (
  id          SERIAL PRIMARY KEY,
  request_id  INTEGER NOT NULL REFERENCES resource_requests(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  quantity    NUMERIC(12,2) NOT NULL CHECK (quantity > 0)
);

-- ธุรกรรมคลัง แยกประเภท รับเข้า/เบิกจ่าย/รับคืน ตามที่ออกแบบไว้ (แก้ข้อจำกัดของ prototype)
CREATE TABLE stock_movements (
  id             SERIAL PRIMARY KEY,
  warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
  material_id    INTEGER NOT NULL REFERENCES materials(id),
  project_id     INTEGER REFERENCES projects(id),          -- NULL ได้ถ้าเป็นการรับเข้าคลังทั่วไป ไม่ผูกโครงการ
  request_id     INTEGER REFERENCES resource_requests(id), -- อ้างอิงกลับไปยังคำขอที่ทำให้เกิดการจ่ายนี้
  movement_type  VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out', 'return')),
  quantity       NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  handled_by     INTEGER NOT NULL REFERENCES users(id),
  movement_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. ครุภัณฑ์ (แยกจากวัสดุสิ้นเปลือง มี workflow อนุมัติ)
-- ------------------------------------------------------------

CREATE TABLE equipment (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  category         VARCHAR(100),
  condition_status VARCHAR(20) NOT NULL DEFAULT 'ปกติ'
                     CHECK (condition_status IN ('ปกติ', 'ชำรุด', 'ส่งซ่อม')),
  current_site_id  INTEGER REFERENCES projects(id),   -- NULL = อยู่คลังหลัก ไม่ได้อยู่หน้าไซต์
  custodian_id     INTEGER REFERENCES users(id)        -- เสมียนผู้ดูแล
);

CREATE TABLE equipment_approvals (
  id             SERIAL PRIMARY KEY,
  equipment_id   INTEGER REFERENCES equipment(id) ON DELETE CASCADE,  -- NULL ถ้าเป็นคำขอจัดซื้อของใหม่ที่ยังไม่มี record
  approval_type  VARCHAR(20) NOT NULL CHECK (approval_type IN ('ซ่อมบำรุง', 'จัดซื้อใหม่')),
  status         VARCHAR(20) NOT NULL DEFAULT 'รออนุมัติ'
                   CHECK (status IN ('รออนุมัติ', 'อนุมัติ', 'ปฏิเสธ')),
  requested_by   INTEGER NOT NULL REFERENCES users(id),
  approved_by    INTEGER REFERENCES users(id),
  note           TEXT,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at     TIMESTAMPTZ
);

-- ร้านค้า/ร้านซ่อมภายนอก (Vendor Directory) — ใช้พิกัด lat/lng เพื่อคำนวณระยะทาง
-- จากตำแหน่งปัจจุบันของผู้ใช้งาน (Haversine) ในหน้า "ร้านค้า & บริการซ่อม"
CREATE TABLE vendors (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('ร้านซ่อมอุปกรณ์', 'ร้านขายอุปกรณ์และวัสดุ')),
  category   VARCHAR(50) NOT NULL,
  address    TEXT,
  phone      VARCHAR(20),
  open_time  TIME NOT NULL,
  close_time TIME NOT NULL,
  open_days  VARCHAR(50) NOT NULL DEFAULT 'ทุกวัน',
  lat        NUMERIC(9,6) NOT NULL,
  lng        NUMERIC(9,6) NOT NULL,
  added_by   INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. เอกสารและบัญชี
-- ------------------------------------------------------------

CREATE TABLE document_types (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,   -- เช่น ใบเสนอราคา, ใบแจ้งหนี้, สัญญา
  category VARCHAR(50)              -- เช่น contract, financial, hr, tax
);

CREATE TABLE documents (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER REFERENCES projects(id),
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  client_id        INTEGER REFERENCES clients(id),
  doc_number       VARCHAR(30) NOT NULL UNIQUE,     -- เช่น IV-2231, QT-1042
  status           VARCHAR(20) NOT NULL DEFAULT 'ร่าง'
                     CHECK (status IN ('ร่าง', 'ส่งแล้ว', 'อนุมัติแล้ว', 'ชำระแล้ว', 'เกินกำหนด')),
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  issue_date       DATE,
  due_date         DATE,
  file_url         TEXT,
  uploaded_by      INTEGER REFERENCES users(id),
  approved_by      INTEGER REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- รายการแยกประเภทของแต่ละเอกสาร (สำหรับบิลแบบแยกรายการที่ทำไว้)
CREATE TABLE document_items (
  id               SERIAL PRIMARY KEY,
  document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category         VARCHAR(50) NOT NULL,   -- วัสดุก่อสร้าง / ค่าแรงงาน / ค่าบริการอื่นๆ
  description      VARCHAR(255) NOT NULL,
  quantity         NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit             VARCHAR(30),
  unit_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_datetime      TIMESTAMPTZ,   -- ใช้เฉพาะรายการวัสดุ
  delivered_datetime  TIMESTAMPTZ    -- วันเวลานำเข้าไซต์งาน
);

CREATE TABLE transactions (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER REFERENCES projects(id),
  document_id  INTEGER REFERENCES documents(id),
  type         VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  category     VARCHAR(100) NOT NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note         TEXT,
  recorded_by  INTEGER NOT NULL REFERENCES users(id),
  tx_date      DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ------------------------------------------------------------
-- Indexes ที่ช่วยให้ query หน้าแดชบอร์ด/รายงานเร็วขึ้น
-- ------------------------------------------------------------
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_stock_movements_material ON stock_movements(material_id, warehouse_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_transactions_project_date ON transactions(project_id, tx_date);
CREATE INDEX idx_resource_requests_status ON resource_requests(status);
CREATE INDEX idx_subcontractors_specialty ON subcontractors(specialty);
CREATE INDEX idx_vendors_type_category ON vendors(type, category);

-- ------------------------------------------------------------
-- ข้อมูลโมดูลที่เก็บเป็นก้อน JSON (คลัง เอกสาร ทีม ผู้ขาย ฯลฯ) — ดู routes/state.js
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_state (
  key        text PRIMARY KEY,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer
);
