-- ============================================================
-- ไทยโครงสร้าง — ระบบจัดการรับเหมาก่อสร้าง
-- SQLite schema (เทียบเท่า schema.sql ฝั่ง PostgreSQL)
-- ============================================================
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ceo','supervisor','store','clerk')),
  phone         TEXT,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  contact    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE client_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE projects (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      INTEGER NOT NULL REFERENCES clients(id),
  supervisor_id  INTEGER REFERENCES users(id),
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'วางแผน' CHECK (status IN ('วางแผน','กำลังก่อสร้าง','ตรวจรับงาน','เสร็จสิ้น')),
  progress       INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget         REAL NOT NULL DEFAULT 0,
  spent          REAL NOT NULL DEFAULT 0,
  start_date     TEXT,
  end_date       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_phases (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name       TEXT NOT NULL,
  phase_order      INTEGER NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE TABLE workers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  wage_per_day REAL NOT NULL DEFAULT 0,
  phone        TEXT,
  status       TEXT NOT NULL DEFAULT 'ว่าง' CHECK (status IN ('ทำงาน','ว่าง','ลา'))
);

CREATE TABLE project_assignments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_id  INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL DEFAULT (date('now')),
  end_date   TEXT,
  UNIQUE (project_id, worker_id, start_date)
);

CREATE TABLE subcontractors (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  specialty      TEXT NOT NULL,
  company_name   TEXT NOT NULL,
  contact_name   TEXT,
  phone          TEXT,
  project_id     INTEGER REFERENCES projects(id),
  contract_value REAL NOT NULL DEFAULT 0,
  start_date     TEXT,
  end_date       TEXT,
  status         TEXT NOT NULL DEFAULT 'รอเริ่มงาน' CHECK (status IN ('รอเริ่มงาน','กำลังทำงาน','เสร็จสิ้น'))
);

CREATE TABLE resource_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'รอดำเนินการ' CHECK (status IN ('รอดำเนินการ','จ่ายแล้ว','ยกเลิก')),
  needed_date  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE warehouses (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT NOT NULL,
  is_main INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE materials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  category        TEXT,
  unit            TEXT NOT NULL,
  price_per_unit  REAL NOT NULL DEFAULT 0,
  min_stock_level REAL NOT NULL DEFAULT 0
);

CREATE TABLE warehouse_stock (
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity     REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, material_id)
);

CREATE TABLE request_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES resource_requests(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  quantity    REAL NOT NULL CHECK (quantity > 0)
);

CREATE TABLE stock_movements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id  INTEGER NOT NULL REFERENCES warehouses(id),
  material_id   INTEGER NOT NULL REFERENCES materials(id),
  project_id    INTEGER REFERENCES projects(id),
  request_id    INTEGER REFERENCES resource_requests(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','return')),
  quantity      REAL NOT NULL CHECK (quantity > 0),
  handled_by    INTEGER NOT NULL REFERENCES users(id),
  movement_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE equipment (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  category         TEXT,
  condition_status TEXT NOT NULL DEFAULT 'ปกติ' CHECK (condition_status IN ('ปกติ','ชำรุด','ส่งซ่อม')),
  current_site_id  INTEGER REFERENCES projects(id),
  custodian_id     INTEGER REFERENCES users(id)
);

CREATE TABLE equipment_approvals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id  INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('ซ่อมบำรุง','จัดซื้อใหม่')),
  status        TEXT NOT NULL DEFAULT 'รออนุมัติ' CHECK (status IN ('รออนุมัติ','อนุมัติ','ปฏิเสธ')),
  requested_by  INTEGER NOT NULL REFERENCES users(id),
  approved_by   INTEGER REFERENCES users(id),
  note          TEXT,
  requested_at  TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at    TEXT
);

CREATE TABLE vendors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('ร้านซ่อมอุปกรณ์','ร้านขายอุปกรณ์และวัสดุ')),
  category   TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  open_time  TEXT NOT NULL,
  close_time TEXT NOT NULL,
  open_days  TEXT NOT NULL DEFAULT 'ทุกวัน',
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  added_by   INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE document_types (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  category TEXT
);

CREATE TABLE documents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id       INTEGER REFERENCES projects(id),
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  client_id        INTEGER REFERENCES clients(id),
  doc_number       TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'ร่าง' CHECK (status IN ('ร่าง','ส่งแล้ว','อนุมัติแล้ว','ชำระแล้ว','เกินกำหนด')),
  amount           REAL NOT NULL DEFAULT 0,
  issue_date       TEXT,
  due_date         TEXT,
  file_url         TEXT,
  uploaded_by      INTEGER REFERENCES users(id),
  approved_by      INTEGER REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE document_items (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id        INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category           TEXT NOT NULL,
  description        TEXT NOT NULL,
  quantity           REAL NOT NULL DEFAULT 1,
  unit               TEXT,
  unit_price         REAL NOT NULL DEFAULT 0,
  order_datetime     TEXT,
  delivered_datetime TEXT
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER REFERENCES projects(id),
  document_id INTEGER REFERENCES documents(id),
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  category    TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount > 0),
  note        TEXT,
  recorded_by INTEGER NOT NULL REFERENCES users(id),
  tx_date     TEXT NOT NULL DEFAULT (date('now'))
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_stock_movements_material ON stock_movements(material_id, warehouse_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_transactions_project_date ON transactions(project_id, tx_date);
CREATE INDEX idx_resource_requests_status ON resource_requests(status);
CREATE INDEX idx_subcontractors_specialty ON subcontractors(specialty);
CREATE INDEX idx_vendors_type_category ON vendors(type, category);
