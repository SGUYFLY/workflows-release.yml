// main.js — แอปเดสก์ท็อป "ไทยโครงสร้าง"
//  ค่าเริ่มต้น: ใช้ฐานข้อมูล PGlite ฝังตัว (ออฟไลน์)
//  โหมดเชื่อมต่อออนไลน์: ถ้ามี config.databaseUrl จะใช้ Supabase/PostgreSQL แทน
//                       พร้อม JWT_SECRET เดียวกับเว็บออนไลน์ (Render) — ข้อมูลและการล็อกอินใช้ร่วมกัน
const { app, BrowserWindow, Menu, shell, dialog, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const PREFERRED_PORT = 47830; // พอร์ตคงที่ เพื่อให้การล็อกอินที่จำไว้ยังอยู่ครั้งหน้า

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win;
let backend; // { server, pool, port, dataDir, mode: 'embedded' | 'cloud' }

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')) || {}; }
  catch { return {}; }
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg || {}, null, 2));
}

function requirePg() {
  // backend/node_modules มี pg ติดตั้งไว้แล้ว ใช้ path นั้นเพื่อเลี่ยงปัญหาการค้นหาโมดูล
  try { return require(require.resolve('pg', { paths: [path.join(__dirname, 'backend')] })); }
  catch { return require('pg'); }
}

async function startBackend() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const cfg = loadConfig();
  const useCloud = !!(cfg.databaseUrl && String(cfg.databaseUrl).trim());

  if (useCloud) {
    process.env.DATABASE_URL = String(cfg.databaseUrl).trim();
    if (cfg.jwtSecret) process.env.JWT_SECRET = String(cfg.jwtSecret);
  } else {
    process.env.DATABASE_URL = '';
    process.env.DATA_DIR = dataDir;
  }
  process.env.HOST = '127.0.0.1';

  // ล้าง require cache ของ backend เพื่อให้โหลด db.js ใหม่ตามค่าปัจจุบัน (กรณีสลับโหมด)
  Object.keys(require.cache).forEach((k) => { if (k.includes(path.sep + 'backend' + path.sep)) delete require.cache[k]; });

  const { start, pool } = require(path.join(__dirname, 'backend', 'server.js'));
  let server;
  try { server = await start(PREFERRED_PORT, '127.0.0.1'); }
  catch (e) { if (e.code === 'EADDRINUSE') server = await start(0, '127.0.0.1'); else throw e; }
  backend = { server, pool, port: server.address().port, dataDir, mode: useCloud ? 'cloud' : 'embedded' };
}

function buildMenu() {
  const online = backend && backend.mode === 'cloud';
  const t = [
    { label: 'ไฟล์', submenu: [
      { label: 'สำรองข้อมูล...', click: doBackup, enabled: !online },
      { label: 'กู้คืนข้อมูลจากไฟล์สำรอง...', click: doRestore, enabled: !online },
      { label: 'เปิดโฟลเดอร์ข้อมูล', click: () => shell.openPath(backend.dataDir) },
      { type: 'separator' },
      { label: online ? 'เปลี่ยนการเชื่อมต่อออนไลน์...' : 'เชื่อมต่อข้อมูลออนไลน์ (Supabase)...', click: openCloudSettings },
      { label: 'ปิดการเชื่อมต่อออนไลน์ (ใช้ข้อมูลในเครื่อง)', click: disconnectCloud, visible: online },
      { type: 'separator' },
      { label: 'ออก', role: 'quit' },
    ] },
    { label: 'มุมมอง', submenu: [
      { label: 'โหลดหน้าใหม่', role: 'reload' },
      { label: 'ขยาย', role: 'zoomIn' }, { label: 'ย่อ', role: 'zoomOut' }, { label: 'ขนาดปกติ', role: 'resetZoom' },
      { label: 'เต็มหน้าจอ', role: 'togglefullscreen' },
    ] },
    { label: 'ช่วยเหลือ', submenu: [
      { label: `ไทยโครงสร้าง v${app.getVersion()}  ·  โหมด: ${online ? 'ออนไลน์ (Supabase)' : 'ในเครื่อง (ออฟไลน์)'}`, enabled: false },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

async function doBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  const r = await dialog.showSaveDialog(win, { title: 'สำรองข้อมูล', defaultPath: `ThaiStructure-backup-${stamp}.tar.gz`, filters: [{ name: 'ไฟล์สำรอง', extensions: ['gz'] }] });
  if (r.canceled || !r.filePath) return;
  try { await backend.pool.backup(r.filePath); dialog.showMessageBox(win, { message: 'สำรองข้อมูลเรียบร้อย', detail: r.filePath }); }
  catch (e) { dialog.showErrorBox('สำรองข้อมูลไม่สำเร็จ', String(e.message || e)); }
}

async function doRestore() {
  const r = await dialog.showOpenDialog(win, { title: 'เลือกไฟล์สำรอง', properties: ['openFile'], filters: [{ name: 'ไฟล์สำรอง', extensions: ['gz'] }] });
  if (r.canceled || !r.filePaths[0]) return;
  const c = await dialog.showMessageBox(win, { type: 'warning', buttons: ['กู้คืน', 'ยกเลิก'], defaultId: 1, cancelId: 1, message: 'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลในไฟล์สำรอง', detail: 'ระบบจะเก็บข้อมูลเดิมไว้ในโฟลเดอร์ pgdata.before-restore และเปิดแอปใหม่' });
  if (c.response !== 0) return;
  fs.copyFileSync(r.filePaths[0], path.join(backend.dataDir, 'restore.tar.gz'));
  app.relaunch(); app.quit();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 880, minWidth: 900, minHeight: 600,
    title: 'ไทยโครงสร้าง', backgroundColor: '#EBEAE4', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') },
  });
  const origin = `http://127.0.0.1:${backend.port}`;
  // อนุญาตเฉพาะสิทธิ์ที่แอปต้องใช้ (ตำแหน่งสำหรับค้นหาร้านใกล้เคียง) และเฉพาะหน้าของแอปเอง
  const allowed = new Set(['geolocation']);
  const fromApp = (wc, url) => { try { return new URL(url || wc.getURL()).origin === origin; } catch { return false; } };
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => cb(allowed.has(permission) && fromApp(wc, details && details.requestingUrl)));
  session.defaultSession.setPermissionCheckHandler((wc, permission, requestingOrigin) => allowed.has(permission) && fromApp(wc, requestingOrigin));
  win.loadURL(origin);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
}

// ---------- การตั้งค่าโหมดออนไลน์ ----------
function openCloudSettings() {
  const w = new BrowserWindow({
    width: 640, height: 620, parent: win, modal: true, title: 'เชื่อมต่อข้อมูลออนไลน์',
    backgroundColor: '#F4F3EE', autoHideMenuBar: true, minimizable: false, maximizable: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      preload: path.join(__dirname, 'cloud-preload.js'),
    },
  });
  w.setMenuBarVisibility(false);
  w.loadFile(path.join(__dirname, 'cloud-settings.html'));
}

async function disconnectCloud() {
  const c = await dialog.showMessageBox(win, {
    type: 'warning', buttons: ['ใช้ข้อมูลในเครื่อง', 'ยกเลิก'], defaultId: 1, cancelId: 1,
    message: 'ปิดการเชื่อมต่อออนไลน์?',
    detail: 'แอปจะกลับไปใช้ฐานข้อมูลในเครื่อง (ไฟล์สำรองเดิมของคุณในเครื่อง) และรีสตาร์ตแอปใหม่ ข้อมูลบนออนไลน์ไม่ถูกลบ',
  });
  if (c.response !== 0) return;
  saveConfig({}); app.relaunch(); app.quit();
}

ipcMain.handle('cloud:current', () => {
  const c = loadConfig();
  return { databaseUrl: c.databaseUrl || '', jwtSecret: c.jwtSecret || '', mode: backend && backend.mode };
});

ipcMain.handle('cloud:test', async (_e, { databaseUrl }) => {
  if (!databaseUrl || !String(databaseUrl).trim()) return { ok: false, error: 'ยังไม่ได้ใส่ DATABASE_URL' };
  const url = String(databaseUrl).trim();
  const { Pool } = requirePg();
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('supabase') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000, max: 1, idleTimeoutMillis: 5000,
  });
  try {
    const t = await pool.query("select count(*)::int as n from information_schema.tables where table_schema='public'");
    const u = await pool.query("select to_regclass('public.users') as r");
    const hasUsers = !!u.rows[0].r;
    let users = 0, projects = 0;
    if (hasUsers) {
      const r1 = await pool.query('select count(*)::int as n from users');
      users = r1.rows[0].n;
      try { const r2 = await pool.query('select count(*)::int as n from projects'); projects = r2.rows[0].n; } catch {}
    }
    return { ok: true, tables: t.rows[0].n, hasUsers, users, projects };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  } finally { try { await pool.end(); } catch {} }
});

ipcMain.handle('cloud:setup-schema', async (_e, { databaseUrl }) => {
  const url = String(databaseUrl || '').trim();
  if (!url) return { ok: false, error: 'ยังไม่ได้ใส่ DATABASE_URL' };
  const schemaPath = path.join(__dirname, 'backend', 'schema.sql');
  if (!fs.existsSync(schemaPath)) return { ok: false, error: 'ไม่พบไฟล์ schema.sql' };
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const { Pool } = requirePg();
  const pool = new Pool({ connectionString: url, ssl: url.includes('supabase') ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 15000, max: 1 });
  try { await pool.query(sql); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
  finally { try { await pool.end(); } catch {} }
});

ipcMain.handle('cloud:save', async (_e, { databaseUrl, jwtSecret }) => {
  const url = String(databaseUrl || '').trim();
  const sec = String(jwtSecret || '').trim();
  if (!url) return { ok: false, error: 'กรุณากรอก DATABASE_URL' };
  if (sec.length < 16) return { ok: false, error: 'JWT_SECRET ต้องยาวอย่างน้อย 16 ตัว' };
  saveConfig({ databaseUrl: url, jwtSecret: sec });
  setTimeout(() => { app.relaunch(); app.quit(); }, 300);
  return { ok: true };
});

ipcMain.handle('cloud:cancel', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.close(); });

// ---------- วงจรชีวิตของแอป ----------
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(async () => {
  try { await startBackend(); }
  catch (e) {
    const cfg = loadConfig();
    if (cfg.databaseUrl) {
      const r = dialog.showMessageBoxSync({
        type: 'error', buttons: ['เปิดการตั้งค่าออนไลน์', 'ใช้ข้อมูลในเครื่อง (ปิดออนไลน์)', 'ออก'],
        defaultId: 0, cancelId: 2,
        message: 'เชื่อมต่อฐานข้อมูลออนไลน์ไม่สำเร็จ',
        detail: String((e && e.message) || e),
      });
      if (r === 1) { saveConfig({}); app.relaunch(); app.quit(); return; }
      if (r === 2) { app.quit(); return; }
      // r === 0: เปิดการตั้งค่าแม้ไม่มีหน้าต่างหลัก — เปิดการตั้งค่าโดยไม่มี parent
      buildMenu();
      openCloudSettings();
      return;
    }
    dialog.showErrorBox('เริ่มระบบไม่สำเร็จ', String((e && e.stack) || e));
    app.quit(); return;
  }
  buildMenu(); createWindow();
}).catch((e) => { dialog.showErrorBox('เกิดข้อผิดพลาด', String(e)); app.quit(); });

app.on('window-all-closed', async () => { try { if (backend) { backend.server.close(); if (backend.pool.end) await backend.pool.end(); } } catch {} app.quit(); });
