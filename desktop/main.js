// main.js — แอปเดสก์ท็อป "ไทยโครงสร้าง": เปิดเซิร์ฟเวอร์ในเครื่อง (ฐานข้อมูล PGlite ฝังตัว) แล้วแสดงหน้าเว็บในหน้าต่างแอป
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PREFERRED_PORT = 47830; // พอร์ตคงที่ เพื่อให้การล็อกอินที่จำไว้ยังอยู่ครั้งหน้า

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win;
let backend; // { server, pool, port }

async function startBackend() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = '';       // บังคับใช้ฐานข้อมูลฝังตัวเสมอ
  process.env.DATA_DIR = dataDir;
  process.env.HOST = '127.0.0.1';      // รับเฉพาะเครื่องนี้ ไม่เปิดให้เครื่องอื่นในเครือข่าย
  const { start, pool } = require(path.join(__dirname, 'backend', 'server.js'));
  let server;
  try { server = await start(PREFERRED_PORT, '127.0.0.1'); }
  catch (e) { if (e.code === 'EADDRINUSE') server = await start(0, '127.0.0.1'); else throw e; }
  backend = { server, pool, port: server.address().port, dataDir };
}

function buildMenu() {
  const t = [
    { label: 'ไฟล์', submenu: [
      { label: 'สำรองข้อมูล...', click: doBackup },
      { label: 'กู้คืนข้อมูลจากไฟล์สำรอง...', click: doRestore },
      { label: 'เปิดโฟลเดอร์ข้อมูล', click: () => shell.openPath(backend.dataDir) },
      { type: 'separator' },
      { label: 'ออก', role: 'quit' },
    ] },
    { label: 'มุมมอง', submenu: [
      { label: 'โหลดหน้าใหม่', role: 'reload' },
      { label: 'ขยาย', role: 'zoomIn' }, { label: 'ย่อ', role: 'zoomOut' }, { label: 'ขนาดปกติ', role: 'resetZoom' },
      { label: 'เต็มหน้าจอ', role: 'togglefullscreen' },
    ] },
    { label: 'ช่วยเหลือ', submenu: [
      { label: `ไทยโครงสร้าง v${app.getVersion()}`, enabled: false },
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
  win.loadURL(origin);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(async () => {
  try { await startBackend(); } catch (e) { dialog.showErrorBox('เริ่มระบบไม่สำเร็จ', String((e && e.stack) || e)); app.quit(); return; }
  buildMenu(); createWindow();
}).catch((e) => { dialog.showErrorBox('เกิดข้อผิดพลาด', String(e)); app.quit(); });
app.on('window-all-closed', async () => { try { if (backend) { backend.server.close(); await backend.pool.end(); } } catch {} app.quit(); });
