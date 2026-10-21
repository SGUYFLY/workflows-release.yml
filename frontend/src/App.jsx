import React, { useState, useMemo } from "react";
import {
  LayoutDashboard, Building2, FileText, Users, Package, Wallet,
  Plus, X, AlertTriangle, TrendingUp, TrendingDown, Search,
  Phone, ChevronRight, Minus, Wrench, ShoppingCart, Warehouse, Check, Ban, Printer,
  HardHat, ClipboardList, Receipt, User, Ruler, MapPin, Clock, Navigation, Store
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import Assistant from "./Assistant.jsx";

/* ---------------------------------- API ----------------------------------- */

// ค่าว่าง = เรียก API ที่โดเมนเดียวกับหน้าเว็บ (เว็บออนไลน์/แอปเดสก์ท็อป) · ตอน dev ใช้ proxy ใน vite.config.js
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "thai_auth";
const loadAuth = () => { try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; } };
const saveAuth = (a) => { try { a ? localStorage.setItem(TOKEN_KEY, JSON.stringify(a)) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function api(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบว่า backend รันอยู่" + (API_URL ? " ที่ " + API_URL : ""));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`); e.status = res.status; throw e; }
  return data;
}

/* ---------------------------------- DATA ---------------------------------- */

const ROLES = [
  { id: "ceo", label: "CEO" },
  { id: "supervisor", label: "หัวหน้างาน" },
  { id: "store", label: "ฝ่ายสโตร์" },
  { id: "clerk", label: "เสมียน" },
];

const NAV = [
  { id: "dashboard", label: "แผงควบคุม", icon: LayoutDashboard, roles: ["ceo", "supervisor", "store", "clerk"] },
  { id: "projects", label: "โครงการ", icon: Building2, roles: ["ceo", "supervisor"] },
  { id: "store", label: "คลังวัสดุ & ครุภัณฑ์", icon: Package, roles: ["ceo", "store", "clerk"] },
  { id: "vendors", label: "ร้านค้า & บริการซ่อม", icon: Store, roles: ["ceo", "store", "clerk"] },
  { id: "documents", label: "เอกสาร & บัญชี", icon: FileText, roles: ["ceo", "clerk"] },
  { id: "team", label: "ทีมช่าง", icon: Users, roles: ["ceo", "supervisor"] },
];

const STATUS_STYLE = {
  วางแผน: { bg: "#EEF1F2", fg: "#5A6870", dot: "#8A97A0" },
  กำลังก่อสร้าง: { bg: "#FDEEE3", fg: "#C24F14", dot: "#E8641C" },
  ตรวจรับงาน: { bg: "#FCF3D9", fg: "#8A6A0A", dot: "#D4A017" },
  เสร็จสิ้น: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  ร่าง: { bg: "#EEF1F2", fg: "#5A6870", dot: "#8A97A0" },
  ส่งแล้ว: { bg: "#E6EEF5", fg: "#28587D", dot: "#3E7FAD" },
  อนุมัติแล้ว: { bg: "#FCF3D9", fg: "#8A6A0A", dot: "#D4A017" },
  ชำระแล้ว: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  เกินกำหนด: { bg: "#F9E4E1", fg: "#A6362A", dot: "#C0392B" },
  ทำงาน: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  ว่าง: { bg: "#EEF1F2", fg: "#5A6870", dot: "#8A97A0" },
  ลา: { bg: "#F9E4E1", fg: "#A6362A", dot: "#C0392B" },
  ปกติ: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  ชำรุด: { bg: "#F9E4E1", fg: "#A6362A", dot: "#C0392B" },
  ส่งซ่อม: { bg: "#FCF3D9", fg: "#8A6A0A", dot: "#D4A017" },
  รออนุมัติ: { bg: "#FCF3D9", fg: "#8A6A0A", dot: "#D4A017" },
  อนุมัติ: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  ปฏิเสธ: { bg: "#F9E4E1", fg: "#A6362A", dot: "#C0392B" },
  รอดำเนินการ: { bg: "#FCF3D9", fg: "#8A6A0A", dot: "#D4A017" },
  จ่ายแล้ว: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  กำลังทำงาน: { bg: "#FDEEE3", fg: "#C24F14", dot: "#E8641C" },
  รอเริ่มงาน: { bg: "#EEF1F2", fg: "#5A6870", dot: "#8A97A0" },
  เปิดอยู่: { bg: "#E5F0E8", fg: "#2E5C40", dot: "#3F7D58" },
  ปิดแล้ว: { bg: "#F9E4E1", fg: "#A6362A", dot: "#C0392B" },
};

const initialProjects = [
  { id: "PJ-01", name: "บ้านพักอาศัย คุณสมชาย", client: "สมชาย ใจดี", status: "กำลังก่อสร้าง", progress: 62, budget: 3200000, spent: 1980000, start: "2026-03-01", end: "2026-09-30", supervisor: "วิชัย ทองดี" },
  { id: "PJ-02", name: "ต่อเติมโกดังสินค้า บจก. ไทยขนส่ง", client: "บจก. ไทยขนส่ง", status: "กำลังก่อสร้าง", progress: 28, budget: 5400000, spent: 1150000, start: "2026-05-15", end: "2027-01-15", supervisor: "ประยุทธ แสงทอง" },
  { id: "PJ-03", name: "ปรับปรุงอาคารพาณิชย์ ถ.สุขุมวิท", client: "กมลรัตน์ พาณิชย์กุล", status: "ตรวจรับงาน", progress: 95, budget: 1850000, spent: 1790000, start: "2026-01-10", end: "2026-06-30", supervisor: "วิชัย ทองดี" },
  { id: "PJ-04", name: "สร้างรั้วและถนนภายในโรงงาน", client: "บจก. รุ่งเรืองอุตสาหกรรม", status: "วางแผน", progress: 0, budget: 980000, spent: 0, start: "2026-08-01", end: "2026-11-30", supervisor: "ประยุทธ แสงทอง" },
];

const initialBilling = [
  { id: "QT-1042", kind: "quote", project: "PJ-04", client: "บจก. รุ่งเรืองอุตสาหกรรม", amount: 980000, status: "ส่งแล้ว", date: "2026-07-10", due: "2026-07-25" },
  { id: "IV-2231", kind: "invoice", project: "PJ-01", client: "สมชาย ใจดี", amount: 800000, status: "ชำระแล้ว", date: "2026-06-01", due: "2026-06-15" },
  { id: "IV-2232", kind: "invoice", project: "PJ-01", client: "สมชาย ใจดี", amount: 640000, status: "เกินกำหนด", date: "2026-07-01", due: "2026-07-15" },
  { id: "IV-2233", kind: "invoice", project: "PJ-03", client: "กมลรัตน์ พาณิชย์กุล", amount: 450000, status: "ส่งแล้ว", date: "2026-07-15", due: "2026-07-29" },
];

// ผู้รับเหมาเฉพาะทาง (Subcontractors) — แยกจากทีมช่างประจำบริษัท (workers) เพราะเป็นการ
// ว่าจ้างเป็นราย "งาน/สัญญา" ต่อผู้รับเหมาแต่ละด้าน ไม่ใช่แรงงานรายวันของบริษัทเอง
// SPECIALTIES เป็นรายการควบคุม (controlled list) เพื่อไม่ให้เกิดชื่อสาขาซ้ำซ้อนกัน
// เช่น "ไฟฟ้า" กับ "ช่างไฟ" ที่จริงเป็นด้านเดียวกันแต่พิมพ์ต่างกัน
const SPECIALTIES = ["โครงสร้าง", "ไฟฟ้า", "ประปา", "สี/ตกแต่ง", "กระจกอลูมิเนียม", "แอร์และระบบปรับอากาศ", "หลังคา", "ระบบดับเพลิง", "ภูมิทัศน์/สวน"];

const initialSubcontractors = [
  { id: "SC-01", specialty: "ไฟฟ้า", company: "หจก. ไฟฟ้าเจริญพาณิชย์", contact: "สมหมาย เจริญพาณิชย์", phone: "081-777-1001", project: "PJ-03", contractValue: 320000, start: "2026-01-15", end: "2026-06-20", status: "เสร็จสิ้น" },
  { id: "SC-02", specialty: "ประปา", company: "ทีมงานช่างประปาสมชาย", contact: "สมชาย น้ำใส", phone: "081-777-1002", project: "PJ-01", contractValue: 180000, start: "2026-04-01", end: "2026-08-31", status: "กำลังทำงาน" },
  { id: "SC-03", specialty: "กระจกอลูมิเนียม", company: "บจก. อลูมิเนียมโมเดิร์น", contact: "วิภา กระจกใส", phone: "081-777-1003", project: "PJ-02", contractValue: 540000, start: "2026-08-01", end: "2026-12-15", status: "รอเริ่มงาน" },
  { id: "SC-04", specialty: "แอร์และระบบปรับอากาศ", company: "หจก. เย็นทั่วไทย แอร์เซอร์วิส", contact: "ประเสริฐ เย็นสบาย", phone: "081-777-1004", project: "PJ-01", contractValue: 260000, start: "2026-07-01", end: "2026-09-15", status: "กำลังทำงาน" },
];

// ร้านค้า/ร้านซ่อม — ใช้พิกัด lat/lng จริงเพื่อคำนวณระยะทางจากตำแหน่งปัจจุบันของผู้ใช้งาน (Haversine)
const VENDOR_TYPES = ["ร้านซ่อมอุปกรณ์", "ร้านขายอุปกรณ์และวัสดุ"];
const VENDOR_CATEGORIES = ["เครื่องมือช่าง", "ไฟฟ้า", "ประปา", "วัสดุก่อสร้างทั่วไป", "เครื่องจักรกล", "อะไหล่และอุปกรณ์นิรภัย"];

const initialVendors = [
  { id: "VD-01", name: "ร้านชัยเจริญอะไหล่ช่าง", type: "ร้านขายอุปกรณ์และวัสดุ", category: "เครื่องมือช่าง", address: "482 ถ.พระราม 2 แขวงแสมดำ กรุงเทพฯ", phone: "02-123-4567", openTime: "08:00", closeTime: "18:00", days: "ทุกวัน", lat: 13.6900, lng: 100.4780 },
  { id: "VD-02", name: "ศูนย์ซ่อมเครื่องมือไฟฟ้า ไทยเทค", type: "ร้านซ่อมอุปกรณ์", category: "ไฟฟ้า", address: "215 ถ.สุขุมวิท แขวงคลองตัน กรุงเทพฯ", phone: "02-234-5678", openTime: "09:00", closeTime: "17:00", days: "จันทร์–เสาร์", lat: 13.7360, lng: 100.5600 },
  { id: "VD-03", name: "ร้านวัสดุก่อสร้างรุ่งเจริญ", type: "ร้านขายอุปกรณ์และวัสดุ", category: "วัสดุก่อสร้างทั่วไป", address: "88 ถ.รามคำแหง แขวงหัวหมาก กรุงเทพฯ", phone: "02-345-6789", openTime: "07:00", closeTime: "19:00", days: "ทุกวัน", lat: 13.7520, lng: 100.6100 },
  { id: "VD-04", name: "ช่างประปาบริการด่วน 24 ชม.", type: "ร้านซ่อมอุปกรณ์", category: "ประปา", address: "56 ถ.ลาดพร้าว แขวงจันทรเกษม กรุงเทพฯ", phone: "081-234-5678", openTime: "00:00", closeTime: "23:59", days: "ทุกวัน", lat: 13.8140, lng: 100.5700 },
  { id: "VD-05", name: "สยามอีควิปเมนท์ เครื่องจักรกลหนัก", type: "ร้านขายอุปกรณ์และวัสดุ", category: "เครื่องจักรกล", address: "199 ถ.บางนา-ตราด แขวงบางนา กรุงเทพฯ", phone: "02-456-7890", openTime: "08:30", closeTime: "17:30", days: "จันทร์–เสาร์", lat: 13.6680, lng: 100.6300 },
  { id: "VD-06", name: "เพาเวอร์เซอร์วิส ศูนย์ซ่อมเครื่องปั่นไฟ", type: "ร้านซ่อมอุปกรณ์", category: "เครื่องจักรกล", address: "77 ถ.เพชรเกษม แขวงบางแค กรุงเทพฯ", phone: "02-567-8901", openTime: "08:00", closeTime: "18:00", days: "จันทร์–ศุกร์", lat: 13.7280, lng: 100.3800 },
];

// ตำแหน่งสำนักงานบริษัท ใช้เป็นจุดอ้างอิงสำรองเมื่อผู้ใช้ไม่อนุญาตการเข้าถึงตำแหน่ง
const COMPANY_LOCATION = { lat: 13.7563, lng: 100.5018 };
// รับพิกัดที่คัดลอกจาก Google Maps เช่น "7.8881, 98.3512" (คลิกขวาที่จุดบนแผนที่ แล้วกดตัวเลขพิกัดเพื่อคัดลอก)
const parseLatLng = (str) => {
  const m = String(str || "").trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
};
const MYLOC_KEY = "thai_myloc";
const loadMyLoc = () => { try { const v = JSON.parse(localStorage.getItem(MYLOC_KEY)); return v && typeof v.lat === "number" ? v : null; } catch { return null; } };
const saveMyLoc = (v) => { try { v ? localStorage.setItem(MYLOC_KEY, JSON.stringify(v)) : localStorage.removeItem(MYLOC_KEY); } catch {} };

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function isOpenNow(openTime, closeTime) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  return closeMin >= openMin ? cur >= openMin && cur <= closeMin : cur >= openMin || cur <= closeMin;
}

const initialTeam = [
  { id: "W-01", name: "วิชัย ทองดี", role: "หัวหน้างาน", project: "PJ-01", wage: 1200, status: "ทำงาน", phone: "081-234-5671" },
  { id: "W-02", name: "ประยุทธ แสงทอง", role: "หัวหน้างาน", project: "PJ-02", wage: 1200, status: "ทำงาน", phone: "081-234-5672" },
  { id: "W-03", name: "สมพงษ์ มีสุข", role: "ช่างปูน", project: "PJ-01", wage: 650, status: "ทำงาน", phone: "082-345-6781" },
  { id: "W-04", name: "อนุชา ศรีสุข", role: "ช่างเหล็ก", project: "PJ-01", wage: 700, status: "ทำงาน", phone: "082-345-6782" },
  { id: "W-05", name: "มานพ บุญมี", role: "ช่างไฟฟ้า", project: "PJ-03", wage: 750, status: "ทำงาน", phone: "083-456-7891" },
  { id: "W-06", name: "สุรชัย ใจเย็น", role: "ช่างประปา", project: "PJ-02", wage: 700, status: "ลา", phone: "083-456-7892" },
];

const initialWarehouses = [
  { id: "WH-01", name: "คลังหลัก (สำนักงาน)", isMain: true },
];

const initialMaterials = [
  { id: "MT-01", name: "ปูนซีเมนต์ปอร์ตแลนด์ (ถุง 50 กก.)", qty: 340, unit: "ถุง", min: 100, price: 165, category: "โครงสร้าง", warehouse: "WH-01" },
  { id: "MT-02", name: "เหล็กเส้น RB9 (เส้น 10 ม.)", qty: 58, unit: "เส้น", min: 80, price: 210, category: "โครงสร้าง", warehouse: "WH-01" },
  { id: "MT-03", name: "ทรายหยาบ", qty: 22, unit: "คิว", min: 15, price: 480, category: "โครงสร้าง", warehouse: "WH-01" },
  { id: "MT-04", name: "อิฐมวลเบา 7.5x20x60 ซม.", qty: 1200, unit: "ก้อน", min: 500, price: 22, category: "งานก่อ", warehouse: "WH-01" },
  { id: "MT-05", name: "สายไฟ THW 2.5 ตร.มม.", qty: 14, unit: "ม้วน", min: 20, price: 1450, category: "ไฟฟ้า", warehouse: "WH-01" },
];

const initialEquipment = [
  { id: "EQ-01", name: "สว่านโรตารี่ Bosch", category: "เครื่องมือไฟฟ้า", condition: "ปกติ", site: "PJ-01", custodian: "อรวรรณ (เสมียน)" },
  { id: "EQ-02", name: "เครื่องปั่นไฟ 5kVA", category: "เครื่องจักร", condition: "ปกติ", site: "PJ-02", custodian: "อรวรรณ (เสมียน)" },
  { id: "EQ-03", name: "นั่งร้านเหล็ก (ชุด)", category: "อุปกรณ์นิรภัย", condition: "ชำรุด", site: "PJ-01", custodian: "อรวรรณ (เสมียน)" },
  { id: "EQ-04", name: "เครื่องตัดเหล็ก", category: "เครื่องมือไฟฟ้า", condition: "ปกติ", site: "คลังหลัก", custodian: "อรวรรณ (เสมียน)" },
];

const initialEquipmentApprovals = [
  { id: "AP-01", equipmentId: "EQ-03", equipmentName: "นั่งร้านเหล็ก (ชุด)", type: "ซ่อมบำรุง", status: "รออนุมัติ", requestedBy: "อรวรรณ (เสมียน)", date: "2026-07-20", note: "ขาเหล็กงอ ใช้งานไม่ได้" },
];

const initialResourceRequests = [
  { id: "RQ-01", project: "PJ-02", requestedBy: "ประยุทธ แสงทอง", material: "เหล็กเส้น RB9", qty: 40, unit: "เส้น", neededDate: "2026-07-30", status: "รอดำเนินการ" },
];

const initialTransactions = [
  { id: "TX-101", type: "income", category: "รับเงินงวดโครงการ", project: "PJ-01", amount: 800000, date: "2026-06-01", note: "IV-2231" },
  { id: "TX-102", type: "expense", category: "ค่าวัสดุ", project: "PJ-01", amount: 420000, date: "2026-06-04", note: "สั่งปูนและเหล็ก" },
  { id: "TX-103", type: "expense", category: "ค่าแรงช่าง", project: "PJ-01", amount: 186000, date: "2026-06-28", note: "ค่าแรงประจำเดือน" },
  { id: "TX-106", type: "expense", category: "ค่าเช่าเครื่องจักร", project: "PJ-02", amount: 95000, date: "2026-05-20", note: "เช่ารถแบคโฮ" },
  { id: "TX-107", type: "income", category: "เงินมัดจำโครงการ", project: "PJ-02", amount: 1080000, date: "2026-05-18", note: "มัดจำ 20%" },
  { id: "TX-109", type: "expense", category: "ค่าวัสดุ", project: "PJ-03", amount: 88000, date: "2026-07-05", note: "งานไฟฟ้าเพิ่มเติม" },
  { id: "TX-110", type: "income", category: "รับเงินงวดโครงการ", project: "PJ-03", amount: 450000, date: "2026-07-15", note: "IV-2233" },
];

/* -------------------------- CLIENT PORTAL DATA -------------------------- */
// Mock only — production would authenticate against a CLIENT_USERS table
// linked to CLIENTS by a real password hash, not a plaintext demo login.
const clientAccounts = [
  { username: "somchai", password: "1234", clientName: "สมชาย ใจดี" },
  { username: "thaitransport", password: "1234", clientName: "บจก. ไทยขนส่ง" },
  { username: "kamolrat", password: "1234", clientName: "กมลรัตน์ พาณิชย์กุล" },
];

const PHASE_TEMPLATE = ["เตรียมพื้นที่ & วางฐานราก", "งานโครงสร้าง", "งานสถาปัตยกรรม", "ระบบไฟฟ้า-ประปา", "งานตกแต่งภายใน-ภายนอก", "ตรวจรับและส่งมอบ"];

const siteUpdatesData = {
  "PJ-01": [
    { date: "2026-07-22", text: "เทพื้นคอนกรีตชั้น 2 เสร็จเรียบร้อย เริ่มงานก่ออิฐผนังชั้น 1 ต่อ" },
    { date: "2026-07-10", text: "ติดตั้งเสาเข็มและฐานรากครบทุกจุดแล้ว ผ่านการตรวจสอบวิศวกร" },
    { date: "2026-06-15", text: "เริ่มงานปรับพื้นที่และวางผังโครงสร้างตามแบบ" },
  ],
  "PJ-02": [
    { date: "2026-07-18", text: "ติดตั้งโครงหลังคาเหล็กโกดังฝั่งทิศเหนือแล้วเสร็จ" },
    { date: "2026-06-20", text: "เทพื้นคอนกรีตพื้นที่จัดเก็บสินค้าเสร็จ 40% ของพื้นที่ทั้งหมด" },
  ],
  "PJ-03": [
    { date: "2026-07-20", text: "ทาสีภายนอกเสร็จเรียบร้อย เหลืองานตกแต่งภายในรอบสุดท้าย" },
    { date: "2026-07-01", text: "ติดตั้งระบบไฟฟ้าและประปาครบทุกชั้น รอตรวจสอบก่อนส่งมอบ" },
    { date: "2026-06-05", text: "ปรับปรุงโครงสร้างพื้นและผนังตามแบบที่อนุมัติ" },
  ],
};

// Itemized line items per billing document — for material lines this includes
// order & site-delivery timestamps so both the client and back-office can
// trace exactly what was ordered, when, and when it physically reached site.
// Labor/service lines have no delivery leg, shown as "—".
const billingItems = {
  "IV-2231": [
    { category: "วัสดุก่อสร้าง", description: "ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.", qty: 200, unit: "ถุง", unitPrice: 165, orderDate: "2026-05-26", orderTime: "09:10", deliveredDate: "2026-05-28", deliveredTime: "13:40" },
    { category: "วัสดุก่อสร้าง", description: "เหล็กเส้น RB9 (10 ม.)", qty: 300, unit: "เส้น", unitPrice: 210, orderDate: "2026-05-26", orderTime: "09:15", deliveredDate: "2026-05-29", deliveredTime: "10:05" },
    { category: "วัสดุก่อสร้าง", description: "ทรายหยาบ", qty: 40, unit: "คิว", unitPrice: 480, orderDate: "2026-05-27", orderTime: "14:00", deliveredDate: "2026-05-29", deliveredTime: "16:20" },
    { category: "วัสดุก่อสร้าง", description: "อิฐมวลเบา 7.5x20x60 ซม.", qty: 3000, unit: "ก้อน", unitPrice: 22, orderDate: "2026-05-27", orderTime: "14:10", deliveredDate: "2026-05-30", deliveredTime: "09:30" },
    { category: "ค่าแรงงาน", description: "ค่าแรงทีมช่างโครงสร้าง (งวดที่ 2)", qty: 1, unit: "งวด", unitPrice: 550000 },
    { category: "ค่าบริการอื่นๆ", description: "ค่าเช่านั่งร้าน/อุปกรณ์หน้างาน", qty: 1, unit: "เดือน", unitPrice: 68800 },
  ],
  "IV-2232": [
    { category: "วัสดุก่อสร้าง", description: "สายไฟ THW 2.5 ตร.มม.", qty: 30, unit: "ม้วน", unitPrice: 1450, orderDate: "2026-06-24", orderTime: "10:00", deliveredDate: "2026-06-26", deliveredTime: "11:15" },
    { category: "วัสดุก่อสร้าง", description: "ท่อ PVC 4 นิ้ว", qty: 200, unit: "ท่อน", unitPrice: 145, orderDate: "2026-06-24", orderTime: "10:05", deliveredDate: "2026-06-27", deliveredTime: "09:50" },
    { category: "ค่าแรงงาน", description: "ค่าแรงทีมช่างระบบไฟฟ้า-ประปา (งวดที่ 3)", qty: 1, unit: "งวด", unitPrice: 500000 },
    { category: "ค่าบริการอื่นๆ", description: "ค่าเช่าเครื่องปั่นไฟหน้างาน", qty: 1, unit: "เดือน", unitPrice: 67500 },
  ],
  "IV-2233": [
    { category: "วัสดุก่อสร้าง", description: "อุปกรณ์และสายไฟงานเพิ่มเติม", qty: 1, unit: "ชุด", unitPrice: 88000, orderDate: "2026-06-30", orderTime: "08:45", deliveredDate: "2026-07-02", deliveredTime: "15:00" },
    { category: "ค่าแรงงาน", description: "ค่าแรงติดตั้งระบบไฟฟ้า-ประปา", qty: 1, unit: "งวด", unitPrice: 300000 },
    { category: "ค่าบริการอื่นๆ", description: "ค่าทาสีภายนอกอาคาร", qty: 1, unit: "งาน", unitPrice: 62000 },
  ],
};

/* ------------------------------- HELPERS ------------------------------- */

const baht = (n) => "฿" + Math.round(n).toLocaleString("th-TH");
const shortDate = (d) => new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
const monthLabel = (d) => new Date(d).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });

// Converts a number into Thai baht text (e.g. 800000 -> "แปดแสนบาทถ้วน") for
// printed financial documents — a standard convention on Thai invoices/vouchers.
function thaiBahtText(number) {
  const digits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  function convertGroup(numStr) {
    let result = "";
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(numStr[i], 10);
      const place = len - i - 1;
      if (digit === 0) continue;
      if (place === 0) result += digit === 1 && len > 1 ? "เอ็ด" : digits[digit];
      else if (place === 1) result += digit === 1 ? "สิบ" : digit === 2 ? "ยี่สิบ" : digits[digit] + "สิบ";
      else result += digits[digit] + units[place];
    }
    return result;
  }
  number = Math.round(number);
  if (number === 0) return "ศูนย์บาทถ้วน";
  let intPart = String(number);
  const groups = [];
  while (intPart.length > 0) { groups.unshift(intPart.slice(-6)); intPart = intPart.slice(0, -6); }
  let text = "";
  groups.forEach((grp, idx) => {
    const stripped = grp.replace(/^0+/, "");
    if (stripped === "") return;
    text += convertGroup(stripped);
    if (idx < groups.length - 1) text += "ล้าน";
  });
  return text + "บาทถ้วน";
}

function StatusTag({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE["วางแผน"];
  return (
    <span className="tag" style={{ background: s.bg, color: s.fg }}>
      <span className="tag-dot" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

function Corners() {
  return (
    <>
      <span className="corner corner-tl" /><span className="corner corner-tr" />
      <span className="corner corner-bl" /><span className="corner corner-br" />
    </>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <Corners />
        <div className="modal-head">
          <span className="eyebrow">แบบฟอร์ม</span>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const CATEGORY_ORDER = ["วัสดุก่อสร้าง", "ค่าแรงงาน", "ค่าบริการอื่นๆ"];

// Renders a proper itemized financial bill: grouped by category, each material
// line carries order + site-delivery date/time for audit purposes, with
// per-category subtotals and a grand total that should reconcile with the
// invoice's headline amount. Falls back to a single lump-sum line if no
// itemized data exists for that document yet.
function BillItemsTable({ bill }) {
  const items = billingItems[bill.id];
  const s = { fontFamily: "'Sarabun', sans-serif" };
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  if (!items) {
    return (
      <div style={{ ...s, fontSize: 13, color: "#6B7680", padding: "10px 0" }}>
        ยังไม่มีรายการแยกประเภทสำหรับเอกสารนี้ — แสดงเฉพาะยอดรวม: <strong style={mono}>{baht(bill.amount)}</strong>
      </div>
    );
  }

  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    rows: items.filter((it) => it.category === cat),
  })).filter((g) => g.rows.length > 0);

  const grandTotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  return (
    <div style={{ ...s, fontSize: 13 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1C2B33" }}>
              {["รายการ", "จำนวน", "ราคา/หน่วย", "วันเวลาสั่งซื้อ", "วันเวลานำเข้าไซต์งาน", "รวม"].map((h) => (
                <th key={h} style={{ textAlign: h === "รายการ" ? "left" : "right", padding: "7px 10px", fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#6B7680" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <React.Fragment key={g.category}>
                <tr><td colSpan={6} style={{ padding: "10px 10px 4px", fontWeight: 700, fontSize: 12.5, color: "#E8641C", fontFamily: "'Bai Jamjuree', sans-serif" }}>{g.category}</td></tr>
                {g.rows.map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(28,43,51,0.1)" }}>
                    <td style={{ padding: "7px 10px" }}>{it.description}<div style={{ ...mono, fontSize: 11, color: "#6B7680" }}>{it.qty} {it.unit} × {baht(it.unitPrice)}</div></td>
                    <td style={{ padding: "7px 10px", textAlign: "right", ...mono, fontSize: 12 }}>{it.qty} {it.unit}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", ...mono, fontSize: 12 }}>{baht(it.unitPrice)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", ...mono, fontSize: 11.5, color: "#6B7680" }}>{it.orderDate ? `${shortDate(it.orderDate)} · ${it.orderTime}` : "—"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", ...mono, fontSize: 11.5, color: "#6B7680" }}>{it.deliveredDate ? `${shortDate(it.deliveredDate)} · ${it.deliveredTime}` : "—"}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", ...mono, fontWeight: 600 }}>{baht(it.qty * it.unitPrice)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} style={{ padding: "5px 10px", textAlign: "right", fontSize: 12, color: "#6B7680" }}>รวม{g.category}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", ...mono, fontWeight: 600 }}>{baht(g.rows.reduce((sum, it) => sum + it.qty * it.unitPrice, 0))}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #1C2B33" }}>
              <td colSpan={5} style={{ padding: "10px", textAlign: "right", fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 700, fontSize: 14 }}>ยอดรวมทั้งสิ้น (รวมภาษีมูลค่าเพิ่มแล้ว)</td>
              <td style={{ padding: "10px", textAlign: "right", ...mono, fontWeight: 700, fontSize: 15, color: "#E8641C" }}>{baht(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ------------------------- PRINT-FRIENDLY DOCUMENTS ------------------------- */
// Shared print mechanism: only .print-area is made visible when the browser's
// print dialog runs, everything else (sidebar, buttons, backdrop) is hidden —
// so "พิมพ์" always outputs a clean document with no app chrome.

function PrintModal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>
      <div className="print-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="print-modal-head">
          <span className="eyebrow">ตัวอย่างก่อนพิมพ์</span>
          <h3>{title}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn accent small" onClick={() => window.print()}><Printer size={14} /> พิมพ์ / บันทึกเป็น PDF</button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="print-modal-body">
          <div className="print-area">{children}</div>
        </div>
      </div>
    </div>
  );
}

const pd = { fontFamily: "'Sarabun', sans-serif", color: "#1C2B33", background: "#fff", padding: "10px 6px" };
const pdMono = { fontFamily: "'JetBrains Mono', monospace" };

function DocHeader({ docType, docId }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1C2B33", paddingBottom: 16, marginBottom: 20 }}>
      <div>
        <div style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 700, fontSize: 21 }}>ไทยโครงสร้าง</div>
        <div style={{ fontSize: 12, color: "#6B7680" }}>บริษัท ไทยโครงสร้าง จำกัด · รับเหมาก่อสร้างครบวงจร</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 700, fontSize: 18, color: "#E8641C" }}>{docType}</div>
        <div style={{ ...pdMono, fontSize: 13 }}>{docId}</div>
      </div>
    </div>
  );
}

function SignatureRow({ labels }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-around", marginTop: 70, gap: 20 }}>
      {labels.map((l) => (
        <div key={l} style={{ textAlign: "center", fontSize: 12.5 }}>
          <div style={{ borderTop: "1px solid #1C2B33", width: 170, marginBottom: 6 }} />
          {l}
        </div>
      ))}
    </div>
  );
}

// A) Printable invoice / quote — reuses BillItemsTable for the itemized breakdown.
function PrintableBillDocument({ bill }) {
  return (
    <div style={pd}>
      <DocHeader docType={bill.kind === "invoice" ? "ใบแจ้งหนี้" : "ใบเสนอราคา"} docId={bill.id} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13.5 }}>
        <div><strong>ลูกค้า:</strong> {bill.client}<br /><strong>โครงการ:</strong> {bill.project}</div>
        <div style={{ textAlign: "right" }}><strong>วันที่ออกเอกสาร:</strong> {shortDate(bill.date)}<br /><strong>ครบกำหนดชำระ:</strong> {shortDate(bill.due)}</div>
      </div>
      <BillItemsTable bill={bill} />
      <div style={{ fontSize: 12.5, color: "#6B7680", marginTop: 8 }}>({thaiBahtText(bill.amount)})</div>
      <SignatureRow labels={["ผู้จัดทำเอกสาร", "ผู้อนุมัติ", "ผู้รับเอกสาร / ลูกค้า"]} />
    </div>
  );
}

// B) Printable project financial summary
function PrintableProjectSummary({ project, billing }) {
  const projBilling = billing.filter((b) => b.project === project.id);
  const invoices = projBilling.filter((b) => b.kind === "invoice");
  const totalInvoiced = invoices.reduce((s, b) => s + b.amount, 0);
  const totalPaid = invoices.filter((b) => b.status === "ชำระแล้ว").reduce((s, b) => s + b.amount, 0);
  return (
    <div style={pd}>
      <DocHeader docType="สรุปยอดโครงการ" docId={project.id} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
        <tbody>
          {[
            ["ชื่อโครงการ", project.name], ["ลูกค้า", project.client], ["หัวหน้างาน", project.supervisor],
            ["สถานะ", project.status], ["ระยะเวลา", `${shortDate(project.start)} — ${shortDate(project.end)}`],
            ["ความคืบหน้า", `${project.progress}%`],
          ].map((row) => (
            <tr key={row[0]} style={{ borderBottom: "1px solid #E5E4DE" }}>
              <td style={{ padding: "7px 6px", color: "#6B7680", width: "30%" }}>{row[0]}</td>
              <td style={{ padding: "7px 6px", fontWeight: 500 }}>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>สรุปการเงิน</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E5E4DE" }}><td style={{ padding: "7px 6px" }}>งบประมาณโครงการ</td><td style={{ padding: "7px 6px", textAlign: "right", ...pdMono }}>{baht(project.budget)}</td></tr>
          <tr style={{ borderBottom: "1px solid #E5E4DE" }}><td style={{ padding: "7px 6px" }}>ใช้จ่ายจริงสะสม</td><td style={{ padding: "7px 6px", textAlign: "right", ...pdMono }}>{baht(project.spent)}</td></tr>
          <tr style={{ borderBottom: "1px solid #E5E4DE" }}><td style={{ padding: "7px 6px", fontWeight: 700 }}>งบประมาณคงเหลือ</td><td style={{ padding: "7px 6px", textAlign: "right", ...pdMono, fontWeight: 700 }}>{baht(project.budget - project.spent)}</td></tr>
        </tbody>
      </table>
      {invoices.length > 0 && (
        <>
          <div style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>ใบแจ้งหนี้ที่ออกแล้ว</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #1C2B33" }}>
              <th style={{ textAlign: "left", padding: "6px" }}>เลขที่</th><th style={{ textAlign: "left", padding: "6px" }}>วันที่</th>
              <th style={{ textAlign: "right", padding: "6px" }}>จำนวนเงิน</th><th style={{ textAlign: "left", padding: "6px" }}>สถานะ</th>
            </tr></thead>
            <tbody>
              {invoices.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #E5E4DE" }}>
                  <td style={{ padding: "6px", ...pdMono }}>{b.id}</td><td style={{ padding: "6px", ...pdMono }}>{shortDate(b.date)}</td>
                  <td style={{ padding: "6px", textAlign: "right", ...pdMono }}>{baht(b.amount)}</td><td style={{ padding: "6px" }}>{b.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #1C2B33" }}>
                <td colSpan={2} style={{ padding: "6px", fontWeight: 700 }}>รวมชำระแล้ว {baht(totalPaid)} / แจ้งหนี้ทั้งหมด</td>
                <td style={{ padding: "6px", textAlign: "right", ...pdMono, fontWeight: 700 }}>{baht(totalInvoiced)}</td><td />
              </tr>
            </tfoot>
          </table>
        </>
      )}
      <SignatureRow labels={["ผู้จัดทำสรุป", "หัวหน้างาน", "CEO"]} />
    </div>
  );
}

// C) Printable expense / cash-withdrawal voucher (ใบสำคัญจ่าย / ใบเบิกเงิน)
function PrintableExpenseVoucher({ tx }) {
  return (
    <div style={pd}>
      <DocHeader docType="ใบเบิกเงิน / ใบสำคัญจ่าย" docId={tx.id} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
        <tbody>
          {[
            ["วันที่", shortDate(tx.date)], ["โครงการ", tx.project], ["หมวดหมู่รายจ่าย", tx.category],
            ["รายละเอียด", tx.note || "-"],
          ].map((row) => (
            <tr key={row[0]} style={{ borderBottom: "1px solid #E5E4DE" }}>
              <td style={{ padding: "7px 6px", color: "#6B7680", width: "30%" }}>{row[0]}</td>
              <td style={{ padding: "7px 6px", fontWeight: 500 }}>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ border: "1px solid #1C2B33", padding: "16px 18px", marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, color: "#6B7680" }}>จำนวนเงินที่เบิกจ่าย</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: "#E8641C" }}>{baht(tx.amount)}</div>
        <div style={{ fontSize: 12.5, color: "#6B7680", marginTop: 4 }}>({thaiBahtText(tx.amount)})</div>
      </div>
      <SignatureRow labels={["ผู้ขอเบิก", "ผู้อนุมัติจ่าย (CEO)", "ผู้จ่ายเงิน (เสมียน)"]} />
    </div>
  );
}

/* -------------------------------- APP ---------------------------------- */

/* ---------------- เก็บข้อมูลโมดูลลงเซิร์ฟเวอร์ (ไม่หายเมื่อรีเฟรช) ---------------- */
const SAMPLE = {
  billing: initialBilling, team: initialTeam, subcontractors: initialSubcontractors, vendors: initialVendors,
  warehouses: initialWarehouses, materials: initialMaterials, equipment: initialEquipment,
  equipmentApprovals: initialEquipmentApprovals, resourceRequests: initialResourceRequests, transactions: initialTransactions,
};
const EMPTY = {
  billing: [], team: [], subcontractors: [], vendors: [], materials: [], equipment: [], equipmentApprovals: [],
  resourceRequests: [], transactions: [], warehouses: [{ id: "WH-01", name: "คลังหลัก", isMain: true }],
};
const WRITE_ROLES = {
  billing: ["ceo", "clerk"], transactions: ["ceo", "clerk"], team: ["ceo", "supervisor"], subcontractors: ["ceo", "supervisor"],
  vendors: ["ceo", "store", "clerk"], warehouses: ["ceo", "store"], materials: ["ceo", "store"],
  equipment: ["ceo", "store", "clerk"], equipmentApprovals: ["ceo", "store", "clerk"], resourceRequests: ["ceo", "supervisor", "store"],
};
function usePersisted(key, init, { token, role }) {
  const [val, setVal] = useState(init);
  const dirty = React.useRef(false);
  const set = React.useCallback((v) => { dirty.current = true; setVal(v); }, []);
  React.useEffect(() => {
    if (!dirty.current || !WRITE_ROLES[key].includes(role)) return;
    const t = setTimeout(() => { api(`/api/state/${key}`, { method: "PUT", token, body: { data: val } }).catch(() => {}); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [val]);
  return [val, set];
}


function UsersModal({ token, me, onClose }) {
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", role: "supervisor", email: "", password: "" });
  const load = () => api("/api/users", { token }).then(setList).catch((e) => setErr(e.message));
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const add = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try { await api("/api/users", { method: "POST", token, body: f }); setF({ name: "", role: "supervisor", email: "", password: "" }); setMsg("เพิ่มบัญชีแล้ว"); load(); }
    catch (ex) { setErr(ex.message); }
  };
  const resetPw = async (u) => {
    const pw = window.prompt(`ตั้งรหัสผ่านใหม่ให้ ${u.name} (อย่างน้อย 8 ตัวอักษร)`);
    if (!pw) return;
    setErr(""); setMsg("");
    try { await api(`/api/users/${u.id}/password`, { method: "PUT", token, body: { password: pw } }); setMsg("เปลี่ยนรหัสผ่านแล้ว"); } catch (ex) { setErr(ex.message); }
  };
  const del = async (u) => {
    if (!window.confirm(`ลบบัญชี ${u.name}?`)) return;
    setErr(""); setMsg("");
    try { await api(`/api/users/${u.id}`, { method: "DELETE", token }); setMsg("ลบบัญชีแล้ว"); load(); } catch (ex) { setErr(ex.message); }
  };
  const label = (r) => (ROLES.find((x) => x.id === r) || {}).label || r;
  return (
    <Modal title="จัดการบัญชีผู้ใช้" onClose={onClose}>
      {err && <div className="lg-err" style={{ background: "#FDF1EF", borderLeft: "3px solid #C0392B", padding: "8px 10px", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ background: "#E5F0E8", borderLeft: "3px solid #3F7D58", padding: "8px 10px", fontSize: 13, marginBottom: 12 }}>{msg}</div>}
      <div style={{ marginBottom: 16 }}>
        {list.map((u) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
            <div style={{ flex: 1, minWidth: 0 }}><b>{u.name}</b><div style={{ color: "var(--steel)", fontSize: 12 }}>{label(u.role)} · {u.email}</div></div>
            <button className="btn ghost small" onClick={() => resetPw(u)}>รหัสผ่าน</button>
            {u.id !== me.id && <button className="btn ghost small" onClick={() => del(u)}>ลบ</button>}
          </div>
        ))}
      </div>
      <form onSubmit={add}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>เพิ่มบัญชีใหม่</div>
        <div className="field"><label>ชื่อ</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div className="field"><label>ตำแหน่ง</label><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        <div className="field"><label>อีเมล (ใช้ล็อกอิน)</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div className="field"><label>รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label><input type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        <button className="btn accent">เพิ่มบัญชี</button>
      </form>
    </Modal>
  );
}


function StaffAppInner({ auth, onLogout, server, demo }) {
  const role = auth.user.role;
  const token = auth.token;
  const ctx = { token, role };
  const seed = (k) => (server[k] !== undefined ? server[k] : demo ? SAMPLE[k] : EMPTY[k]);
  const [tab, setTab] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [apiError, setApiError] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  React.useEffect(() => {
    api("/api/projects", { token })
      .then((rows) => { setProjects(rows); setApiError(""); })
      .catch((e) => { if (e.status === 401 || e.status === 403) onLogout(); else setApiError(e.message); });
    // eslint-disable-next-line
  }, [token]);
  const [billing, setBilling] = usePersisted("billing", seed("billing"), ctx);
  const [team, setTeam] = usePersisted("team", seed("team"), ctx);
  const [subcontractors, setSubcontractors] = usePersisted("subcontractors", seed("subcontractors"), ctx);
  const [vendors, setVendors] = usePersisted("vendors", seed("vendors"), ctx);
  const [warehouses, setWarehouses] = usePersisted("warehouses", seed("warehouses"), ctx);
  const [materials, setMaterials] = usePersisted("materials", seed("materials"), ctx);
  const [equipment, setEquipment] = usePersisted("equipment", seed("equipment"), ctx);
  const [equipmentApprovals, setEquipmentApprovals] = usePersisted("equipmentApprovals", seed("equipmentApprovals"), ctx);
  const [resourceRequests, setResourceRequests] = usePersisted("resourceRequests", seed("resourceRequests"), ctx);
  const [transactions, setTransactions] = usePersisted("transactions", seed("transactions"), ctx);

  const [modal, setModal] = useState(null);
  const [billingKind, setBillingKind] = useState("invoice");

  const availableNav = NAV.filter((n) => n.roles.includes(role));
  React.useEffect(() => {
    if (!availableNav.find((n) => n.id === tab)) setTab(availableNav[0]?.id || "dashboard");
    // eslint-disable-next-line
  }, [role]);

  const activeProjects = projects.filter((p) => p.status === "กำลังก่อสร้าง" || p.status === "ตรวจรับงาน");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const lowStock = materials.filter((m) => m.qty <= m.min);
  const overdueInvoices = billing.filter((b) => b.status === "เกินกำหนด");
  const pendingApprovals = equipmentApprovals.filter((a) => a.status === "รออนุมัติ");
  const pendingRequests = resourceRequests.filter((r) => r.status === "รอดำเนินการ");
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const monthlyChart = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const key = monthLabel(t.date);
      if (!map[key]) map[key] = { month: key, รายรับ: 0, รายจ่าย: 0, sortKey: t.date.slice(0, 7) };
      if (t.type === "income") map[key].รายรับ += t.amount; else map[key].รายจ่าย += t.amount;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  const addProject = async (data) => {
    try {
      const created = await api("/api/projects", { method: "POST", token, body: data });
      setProjects((p) => [created, ...p]); setModal(null); setApiError("");
    } catch (e) { alert(e.message); }
  };
  const addWorker = (data) => { setTeam((t) => [{ id: `W-0${t.length + 1}`, status: "ว่าง", ...data }, ...t]); setModal(null); };
  const addSubcontractor = (data) => { setSubcontractors((s) => [{ id: `SC-0${s.length + 1}`, status: "รอเริ่มงาน", ...data }, ...s]); setModal(null); };
  const addVendor = (data) => { setVendors((v) => [{ id: `VD-0${v.length + 1}`, ...data }, ...v]); setModal(null); };
  const addBilling = (data) => { setBilling((b) => [{ id: `${billingKind === "quote" ? "QT" : "IV"}-${1000 + b.length + 50}`, kind: billingKind, status: "ร่าง", ...data }, ...b]); setModal(null); };
  const addTransaction = (data) => { setTransactions((t) => [{ id: `TX-${100 + t.length + 20}`, ...data }, ...t]); setModal(null); };
  const addWarehouse = (data) => { setWarehouses((w) => [...w, { id: `WH-0${w.length + 1}`, isMain: false, ...data }]); setModal(null); };
  const addResourceRequest = (data) => { setResourceRequests((r) => [{ id: `RQ-0${r.length + 1}`, status: "รอดำเนินการ", ...data }, ...r]); setModal(null); };
  const addEquipment = (data) => { setEquipment((e) => [{ id: `EQ-0${e.length + 1}`, condition: "ปกติ", ...data }, ...e]); };

  const adjustStock = (id, delta) => setMaterials((ms) => ms.map((m) => (m.id === id ? { ...m, qty: Math.max(0, m.qty + delta) } : m)));
  const cycleProjectStatus = async (id) => {
    if (!["ceo", "supervisor"].includes(role)) { alert("เฉพาะ CEO และหัวหน้างานเท่านั้นที่เปลี่ยนสถานะโครงการได้"); return; }
    const order = ["วางแผน", "กำลังก่อสร้าง", "ตรวจรับงาน", "เสร็จสิ้น"];
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    try {
      const updated = await api(`/api/projects/${id}`, { method: "PUT", token, body: { status: next, progress: next === "เสร็จสิ้น" ? 100 : p.progress } });
      setProjects((ps) => ps.map((x) => (x.id === id ? updated : x)));
    } catch (e) { alert(e.message); }
  };
  const markPaid = (id) => setBilling((bs) => bs.map((b) => (b.id === id ? { ...b, status: "ชำระแล้ว" } : b)));
  const approveQuote = (id) => setBilling((bs) => bs.map((b) => (b.id === id ? { ...b, status: "อนุมัติแล้ว" } : b)));

  const fulfillRequest = (id) => {
    const req = resourceRequests.find((r) => r.id === id);
    if (!req) return;
    setMaterials((ms) => ms.map((m) => (m.name === req.material ? { ...m, qty: Math.max(0, m.qty - req.qty) } : m)));
    setResourceRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status: "จ่ายแล้ว" } : r)));
  };

  const flagEquipment = (equipId, type, note) => {
    const eq = equipment.find((e) => e.id === equipId);
    if (type === "ซ่อมบำรุง") setEquipment((es) => es.map((e) => (e.id === equipId ? { ...e, condition: "ส่งซ่อม" } : e)));
    setEquipmentApprovals((a) => [
      { id: `AP-0${a.length + 1}`, equipmentId: equipId, equipmentName: eq?.name || "", type, status: "รออนุมัติ", requestedBy: "อรวรรณ (เสมียน)", date: new Date().toISOString().slice(0, 10), note },
      ...a,
    ]);
  };
  const decideApproval = (id, decision) => {
    const ap = equipmentApprovals.find((a) => a.id === id);
    setEquipmentApprovals((as) => as.map((a) => (a.id === id ? { ...a, status: decision } : a)));
    if (decision === "อนุมัติ" && ap?.type === "ซ่อมบำรุง") {
      setEquipment((es) => es.map((e) => (e.id === ap.equipmentId ? { ...e, condition: "ปกติ" } : e)));
    }
  };

  return (
    <div className="app-root">
      <style>{`
        * { box-sizing: border-box; }
        .app-root {
          --ink: #1C2B33; --steel: #6B7680; --line: rgba(28,43,51,0.14); --paper: #EBEAE4; --surface: #FFFFFF;
          --accent: #E8641C; --accent-dark: #C24F14; --caution: #D4A017; --success: #3F7D58; --danger: #C0392B;
          font-family: 'Sarabun', sans-serif; color: var(--ink);
          background: linear-gradient(var(--paper), var(--paper)),
            repeating-linear-gradient(0deg, rgba(28,43,51,0.05) 0, rgba(28,43,51,0.05) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, rgba(28,43,51,0.05) 0, rgba(28,43,51,0.05) 1px, transparent 1px, transparent 40px);
          min-height: 100vh; display: flex; font-size: 14px;
        }
        .app-root h1, .app-root h2, .app-root h3, .app-root .display { font-family: 'Bai Jamjuree', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .sidebar { width: 236px; flex-shrink: 0; background: var(--ink); color: #E8E6DF; display: flex; flex-direction: column; min-height: 100vh; }
        .brand { padding: 22px 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .brand .mark { display: flex; align-items: center; gap: 8px; font-family: 'Bai Jamjuree', sans-serif; font-weight: 700; font-size: 17px; color: #fff; }
        .brand .mark span.sq { width: 10px; height: 10px; background: var(--accent); display: inline-block; }
        .brand .sub { margin-top: 4px; font-size: 11px; color: #9AA6AC; letter-spacing: 0.08em; text-transform: uppercase; }
        .role-switch { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .role-switch .eyebrow { color: #9AA6AC; }
        .role-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .role-pill { flex: 1 1 40%; text-align: center; padding: 6px 4px; font-size: 11.5px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.18); color: #C7CDD1; cursor: pointer; background: transparent; font-family: 'Bai Jamjuree', sans-serif; }
        .role-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
        .nav { padding: 10px 10px; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 10px; border-radius: 4px; color: #C7CDD1; cursor: pointer; font-size: 13.5px; margin-bottom: 2px; border-left: 3px solid transparent; }
        .nav-item:hover { background: rgba(255,255,255,0.06); }
        .nav-item.active { background: rgba(232,100,28,0.16); color: #fff; border-left: 3px solid var(--accent); }
        .nav-footer { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 11px; color: #7C8890; }
        .main { flex: 1; padding: 26px 32px 60px; max-width: 1180px; }
        .title-block { display: flex; justify-content: space-between; align-items: flex-end; border: 1px solid var(--ink); background: var(--surface); margin-bottom: 22px; }
        .title-block .tb-cell { padding: 12px 18px; border-right: 1px solid var(--line); }
        .title-block .tb-cell:last-child { border-right: none; }
        .title-block .tb-main { flex: 1; }
        .eyebrow { font-family: 'Bai Jamjuree', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--steel); display: block; margin-bottom: 2px; }
        .title-block h1 { font-size: 22px; margin: 0; font-weight: 600; }
        .tb-meta { text-align: right; }
        .tb-meta .mono { font-size: 13px; }
        .grid { display: grid; gap: 14px; }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .card { position: relative; background: var(--surface); border: 1px solid var(--line); padding: 16px 18px; }
        .corner { position: absolute; width: 9px; height: 9px; border: 2px solid var(--accent); opacity: 0.85; }
        .corner-tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
        .corner-tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
        .corner-bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
        .corner-br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
        .kpi .kpi-label { font-size: 11.5px; color: var(--steel); text-transform: uppercase; letter-spacing: 0.06em; font-family: 'Bai Jamjuree', sans-serif;}
        .kpi .kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 600; margin-top: 6px; }
        .kpi .kpi-sub { font-size: 12px; color: var(--steel); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin: 26px 0 12px; }
        .section-title h2 { font-size: 15px; font-weight: 600; }
        .section-title .count { color: var(--steel); font-size: 12px; font-family: 'JetBrains Mono', monospace; }
        .btn { font-family: 'Bai Jamjuree', sans-serif; font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 3px; border: 1px solid var(--ink); background: var(--ink); color: #fff; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn:hover { background: #0f1a20; }
        .btn.accent { background: var(--accent); border-color: var(--accent); }
        .btn.accent:hover { background: var(--accent-dark); }
        .btn.ghost { background: transparent; color: var(--ink); }
        .btn.success { background: var(--success); border-color: var(--success); }
        .btn.danger-outline { background: transparent; border-color: var(--danger); color: var(--danger); }
        .btn.small { padding: 5px 10px; font-size: 12px; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--steel); padding: 4px; }
        .icon-btn:hover { color: var(--ink); }
        .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .tag-dot { width: 6px; height: 6px; border-radius: 50%; }
        table { width: 100%; border-collapse: collapse; }
        thead th { text-align: left; font-family: 'Bai Jamjuree', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--steel); padding: 8px 12px; border-bottom: 1px solid var(--ink); }
        tbody td { padding: 11px 12px; border-bottom: 1px solid var(--line); font-size: 13.5px; vertical-align: middle; }
        tbody tr:hover { background: rgba(28,43,51,0.03); }
        .table-wrap { background: var(--surface); border: 1px solid var(--line); overflow-x: auto; }
        .progress-track { width: 100%; height: 6px; background: var(--line); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent); }
        .list-plain { list-style: none; padding: 0; margin: 0; }
        .list-plain li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
        .list-plain li:last-child { border-bottom: none; }
        .empty-note { padding: 20px; text-align: center; color: var(--steel); font-size: 13px; }
        .field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 12px; color: var(--steel); font-family: 'Bai Jamjuree', sans-serif; }
        .field input, .field select, .field textarea { font-family: 'Sarabun', sans-serif; padding: 9px 10px; border: 1px solid var(--line); border-radius: 3px; font-size: 13.5px; background: #fff; color: var(--ink); }
        .field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--accent); outline-offset: 0; border-color: var(--accent); }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(28,43,51,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal-panel { position: relative; background: #fff; width: 440px; max-width: 100%; border: 1px solid var(--ink); max-height: 88vh; overflow-y: auto; }
        .print-modal-panel { position: relative; background: #fff; width: 780px; max-width: 96%; border: 1px solid var(--ink); max-height: 92vh; overflow-y: auto; }
        .print-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--line); background: var(--paper); position: sticky; top: 0; }
        .print-modal-head h3 { font-size: 15px; margin: 2px 0 0; }
        .print-modal-body { padding: 4px; }
        .modal-head { display: flex; align-items: center; padding: 16px 18px 10px; border-bottom: 1px solid var(--line); }
        .modal-head h3 { flex: 1; font-size: 16px; margin: 2px 0 0; }
        .modal-body { padding: 16px 18px 20px; }
        .tabs { display: flex; gap: 4px; margin-bottom: 14px; flex-wrap: wrap; }
        .tab-btn { font-family: 'Bai Jamjuree', sans-serif; font-size: 13px; padding: 7px 14px; cursor: pointer; border: 1px solid var(--line); background: #fff; color: var(--steel); }
        .tab-btn.active { background: var(--ink); color: #fff; border-color: var(--ink); }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .search-box { display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: #fff; padding: 7px 10px; flex: 1; max-width: 280px; }
        .search-box input { border: none; outline: none; font-family: 'Sarabun', sans-serif; font-size: 13px; width: 100%; }
        .stock-adjust { display: flex; align-items: center; gap: 6px; }
        .stock-adjust button { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink); }
        .stock-adjust button:hover { border-color: var(--accent); color: var(--accent); }
        .stock-adjust.big button { width: 40px; height: 40px; }
        .stock-adjust.big span { font-size: 15px; min-width: 64px; }
        .field-mode-note { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FFF; border: 1px dashed var(--line); font-size: 12.5px; color: var(--steel); margin-bottom: 14px; }
        .card-list { display: flex; flex-direction: column; gap: 12px; }
        .field-card { position: relative; background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--accent); padding: 16px 16px 14px; }
        .field-card .fc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .field-card .fc-title { font-weight: 600; font-size: 15.5px; line-height: 1.35; }
        .field-card .fc-id { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--steel); margin-top: 2px; }
        .field-card .fc-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--steel); padding: 7px 0; border-top: 1px solid var(--line); }
        .field-card .fc-row:first-of-type { border-top: none; }
        .field-card .fc-row strong { color: var(--ink); font-weight: 600; }
        .btn.big { width: 100%; justify-content: center; padding: 14px; font-size: 14.5px; min-height: 48px; margin-top: 10px; }
        .alert-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--line); border-left: 3px solid var(--caution); background: #FFFBF0; font-size: 13px; margin-bottom: 8px; }
        .alert-row.danger { border-left-color: var(--danger); background: #FDF1EF; }
        @media (max-width: 900px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .grid-3 { grid-template-columns: repeat(2, 1fr); }
          .sidebar { width: 76px; }
          .brand .sub, .nav-item span.label, .nav-footer, .role-switch .eyebrow, .role-switch > div { display: none; }
          .brand { padding-left: 8px; padding-right: 8px; }
          .brand .mark { font-size: 11.5px; }
          .role-switch { padding: 10px 6px; }
          .role-switch .role-pill { font-size: 10px; padding: 6px 2px; margin-top: 6px !important; }
          .main { padding: 20px 14px 40px; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand"><div className="mark"><span className="sq" />ไทยโครงสร้าง</div><div className="sub">ระบบจัดการรับเหมาก่อสร้าง</div></div>
        <div className="role-switch">
          <span className="eyebrow">ผู้ใช้งาน</span>
          <div style={{ color: "#fff", marginTop: 6, fontWeight: 500 }}>{auth.user.name}</div>
          {role === "ceo" && <button className="role-pill" style={{ marginTop: 10, width: "100%" }} onClick={() => setShowUsers(true)}>จัดการบัญชีผู้ใช้</button>}
          <button className="role-pill" style={{ marginTop: 10, width: "100%" }} onClick={onLogout}>ออกจากระบบ</button>
        </div>
        <nav className="nav">
          {availableNav.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
                <Icon size={17} /><span className="label">{n.label}</span>
              </div>
            );
          })}
        </nav>
        <div className="nav-footer">เข้าสู่ระบบในฐานะ<br /><strong style={{ color: "#E8E6DF" }}>{ROLES.find((r) => r.id === role).label}</strong></div>
      </aside>
      {showUsers && <UsersModal token={token} me={auth.user} onClose={() => setShowUsers(false)} />}
      <Assistant token={token} role={role} tab={tab} />

      <main className="main">
        <div className="title-block">
          <div className="tb-cell tb-main">{apiError && <div className="alert-row danger" style={{ marginBottom: 8 }}><AlertTriangle size={14} />{apiError}</div>}<span className="eyebrow">ไทยโครงสร้าง / {NAV.find((n) => n.id === tab)?.label}</span><h1>{NAV.find((n) => n.id === tab)?.label}</h1></div>
          <div className="tb-cell tb-meta"><span className="eyebrow">วันที่</span><div className="mono">27 ก.ค. 2569</div></div>
          <div className="tb-cell tb-meta"><span className="eyebrow">รออนุมัติ</span><div className="mono">{pendingApprovals.length + pendingRequests.length} รายการ</div></div>
        </div>

        {tab === "dashboard" && (
          <DashboardView projects={projects} activeProjects={activeProjects} totalBudget={totalBudget} lowStock={lowStock}
            overdueInvoices={overdueInvoices} pendingApprovals={pendingApprovals} pendingRequests={pendingRequests}
            totalIncome={totalIncome} totalExpense={totalExpense} setTab={setTab} />
        )}
        {tab === "projects" && (
          <ProjectsView projects={projects} billing={billing} role={role} onAdd={() => setModal("project")} onCycle={cycleProjectStatus}
            onRequest={() => setModal("resource")} />
        )}
        {tab === "store" && (
          <StoreView role={role} warehouses={warehouses} materials={materials} equipment={equipment}
            equipmentApprovals={equipmentApprovals} resourceRequests={resourceRequests}
            onAdjustStock={adjustStock} onAddWarehouse={() => setModal("warehouse")}
            onFlagEquipment={flagEquipment} onDecideApproval={decideApproval}
            onFulfillRequest={fulfillRequest} onAddEquipment={() => setModal("equipment")} />
        )}
        {tab === "vendors" && (
          <VendorsView role={role} vendors={vendors} onAdd={() => setModal("vendor")} />
        )}
        {tab === "documents" && (
          <DocumentsView role={role} billing={billing} transactions={transactions} monthlyChart={monthlyChart}
            totalIncome={totalIncome} totalExpense={totalExpense}
            onAddBilling={(kind) => { setBillingKind(kind); setModal("billing"); }}
            onMarkPaid={markPaid} onApproveQuote={approveQuote} onAddTransaction={() => setModal("transaction")} />
        )}
        {tab === "team" && (
          <TeamView role={role} team={team} subcontractors={subcontractors} projects={projects}
            onAdd={() => setModal("worker")} onAddSubcontractor={() => setModal("subcontractor")} />
        )}
      </main>

      {modal === "project" && <ProjectForm onSubmit={addProject} onClose={() => setModal(null)} />}
      {modal === "worker" && <WorkerForm projects={projects} onSubmit={addWorker} onClose={() => setModal(null)} />}
      {modal === "subcontractor" && <SubcontractorForm projects={projects} onSubmit={addSubcontractor} onClose={() => setModal(null)} />}
      {modal === "vendor" && <VendorForm onSubmit={addVendor} onClose={() => setModal(null)} />}
      {modal === "billing" && <BillingForm kind={billingKind} projects={projects} onSubmit={addBilling} onClose={() => setModal(null)} />}
      {modal === "transaction" && <TransactionForm projects={projects} onSubmit={addTransaction} onClose={() => setModal(null)} />}
      {modal === "warehouse" && <WarehouseForm onSubmit={addWarehouse} onClose={() => setModal(null)} />}
      {modal === "resource" && <ResourceRequestForm projects={projects} materials={materials} onSubmit={addResourceRequest} onClose={() => setModal(null)} />}
      {modal === "equipment" && <EquipmentForm projects={projects} onSubmit={(d) => { addEquipment(d); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ----------------------------- DASHBOARD ------------------------------- */

function DashboardView({ projects, activeProjects, totalBudget, lowStock, overdueInvoices, pendingApprovals, pendingRequests, totalIncome, totalExpense, setTab }) {
  return (
    <>
      <div className="grid grid-4">
        <div className="card kpi"><Corners /><div className="kpi-label">โครงการที่ดำเนินการ</div><div className="kpi-value">{activeProjects.length}</div><div className="kpi-sub"><Building2 size={13} /> จากทั้งหมด {projects.length} โครงการ</div></div>
        <div className="card kpi"><Corners /><div className="kpi-label">มูลค่าโครงการรวม</div><div className="kpi-value">{baht(totalBudget)}</div><div className="kpi-sub"><TrendingUp size={13} /> งบประมาณทุกโครงการ</div></div>
        <div className="card kpi"><Corners /><div className="kpi-label">รายรับสะสม</div><div className="kpi-value" style={{ color: "#3F7D58" }}>{baht(totalIncome)}</div><div className="kpi-sub"><TrendingUp size={13} color="#3F7D58" /> รายรับเข้าระบบ</div></div>
        <div className="card kpi"><Corners /><div className="kpi-label">รายจ่ายสะสม</div><div className="kpi-value" style={{ color: "#C0392B" }}>{baht(totalExpense)}</div><div className="kpi-sub"><TrendingDown size={13} color="#C0392B" /> ต้นทุนดำเนินงาน</div></div>
      </div>

      {(overdueInvoices.length > 0 || lowStock.length > 0 || pendingApprovals.length > 0 || pendingRequests.length > 0) && (
        <>
          <div className="section-title"><h2>ต้องดำเนินการ / สังเกตความผิดปกติ</h2></div>
          {pendingApprovals.map((a) => (
            <div className="alert-row danger" key={a.id}><Wrench size={16} color="#C0392B" />รออนุมัติ{a.type}: {a.equipmentName} — แจ้งโดย {a.requestedBy} ({shortDate(a.date)})</div>
          ))}
          {overdueInvoices.map((b) => (
            <div className="alert-row danger" key={b.id}><AlertTriangle size={16} color="#C0392B" />ใบแจ้งหนี้ {b.id} ({b.client}) เกินกำหนดชำระตั้งแต่ {shortDate(b.due)} — ยอด {baht(b.amount)}</div>
          ))}
          {pendingRequests.map((r) => (
            <div className="alert-row" key={r.id}><ShoppingCart size={16} color="#D4A017" />คำขอวัสดุ {r.id}: {r.material} {r.qty} {r.unit} สำหรับ {r.project} รอฝ่ายสโตร์จ่ายของ</div>
          ))}
          {lowStock.map((m) => (
            <div className="alert-row" key={m.id}><Package size={16} color="#D4A017" />วัสดุ "{m.name}" เหลือ {m.qty} {m.unit} ต่ำกว่าจุดสั่งซื้อขั้นต่ำ ({m.min} {m.unit})</div>
          ))}
        </>
      )}

      <div className="section-title"><h2>ความคืบหน้าโครงการ</h2><span className="count" onClick={() => setTab("projects")} style={{ cursor: "pointer" }}>ดูทั้งหมด →</span></div>
      <div className="table-wrap">
        <ul className="list-plain" style={{ padding: "6px 16px" }}>
          {projects.length === 0 && <li style={{ color: "var(--steel)", fontSize: 13.5, padding: "14px 0" }}>ยังไม่มีโครงการ — ไปที่เมนู "โครงการ" แล้วกด "เพิ่มโครงการ" เพื่อเริ่มต้น</li>}
          {projects.slice(0, 5).map((p) => (
            <li key={p.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><strong style={{ fontSize: 13.5 }}>{p.name}</strong><StatusTag status={p.status} /></div>
                <div className="progress-track" style={{ maxWidth: 320 }}><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
              </div>
              <span className="mono" style={{ fontSize: 12.5, color: "#6B7680", marginLeft: 16 }}>{p.progress}%</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ----------------------------- PROJECTS -------------------------------- */

function ProjectsView({ projects, billing, role, onAdd, onCycle, onRequest }) {
  const [q, setQ] = useState("");
  const [printProject, setPrintProject] = useState(null);
  const filtered = projects.filter((p) => p.name.includes(q) || p.client.includes(q));
  return (
    <>
      <div className="toolbar">
        <div className="search-box"><Search size={14} color="#6B7680" /><input placeholder="ค้นหาโครงการหรือลูกค้า..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          {role === "supervisor" && <button className="btn ghost" onClick={onRequest}><ShoppingCart size={15} /> ส่งคำขอวัสดุ</button>}
          {role === "ceo" && <button className="btn accent" onClick={onAdd}><Plus size={15} /> เพิ่มโครงการ</button>}
        </div>
      </div>
      {role === "supervisor" ? (
        <>
          <div className="field-mode-note">โหมดหน้างาน — แตะที่สถานะเพื่ออัปเดตความคืบหน้า</div>
          <div className="card-list">
            {filtered.map((p) => (
              <div className="field-card" key={p.id}>
                <div className="fc-top">
                  <div><div className="fc-title">{p.name}</div><div className="fc-id">{p.id} · {p.client}</div></div>
                  <span onClick={() => onCycle(p.id)} style={{ cursor: "pointer" }}><StatusTag status={p.status} /></span>
                </div>
                <div className="progress-track" style={{ marginBottom: 4 }}><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
                <div className="fc-row"><span>ความคืบหน้า</span><strong>{p.progress}%</strong></div>
                <div className="fc-row"><span>งบ / ใช้ไป</span><strong className="mono">{baht(p.spent)} / {baht(p.budget)}</strong></div>
                <div className="fc-row"><span>กำหนดส่งงาน</span><strong className="mono">{shortDate(p.end)}</strong></div>
                <button className="btn accent big" onClick={onRequest}><ShoppingCart size={16} /> ส่งคำขอวัสดุสำหรับโครงการนี้</button>
                <button className="btn ghost big" onClick={() => setPrintProject(p)}><Printer size={16} /> พิมพ์สรุปยอดโครงการ</button>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty-note">ไม่พบโครงการที่ค้นหา</div>}
          </div>
        </>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>โครงการ</th><th>ลูกค้า</th><th>หัวหน้างาน</th><th>สถานะ</th><th>ความคืบหน้า</th><th>งบ / ใช้ไป</th><th>กำหนดส่งงาน</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong><br /><span className="mono" style={{ fontSize: 11, color: "#6B7680" }}>{p.id}</span></td>
                  <td>{p.client}</td><td>{p.supervisor}</td>
                  <td><span onClick={() => onCycle(p.id)} style={{ cursor: "pointer" }} title="คลิกเพื่อเปลี่ยนสถานะ"><StatusTag status={p.status} /></span></td>
                  <td style={{ minWidth: 120 }}><div className="progress-track"><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div><span className="mono" style={{ fontSize: 11.5, color: "#6B7680" }}>{p.progress}%</span></td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{baht(p.spent)} / {baht(p.budget)}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{shortDate(p.end)}</td>
                  <td><button className="btn small ghost" onClick={() => setPrintProject(p)}><Printer size={12} /> พิมพ์สรุปยอด</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="empty-note">ไม่พบโครงการที่ค้นหา</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {printProject && <PrintModal title={`สรุปยอดโครงการ ${printProject.id}`} onClose={() => setPrintProject(null)}><PrintableProjectSummary project={printProject} billing={billing} /></PrintModal>}
    </>
  );
}

/* ------------------------------ STORE VIEW ------------------------------ */

function StoreView({ role, warehouses, materials, equipment, equipmentApprovals, resourceRequests, onAdjustStock, onAddWarehouse, onFlagEquipment, onDecideApproval, onFulfillRequest, onAddEquipment }) {
  const [sub, setSub] = useState("consumables");
  // CEO = oversight only (views everything, approves exceptions). Routine edits belong to store/clerk.
  const canEditConsumables = role === "store";
  const canEditEquipment = role === "clerk";
  const canManageWarehouses = role === "store";
  const canDecide = role === "ceo";

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn ${sub === "consumables" ? "active" : ""}`} onClick={() => setSub("consumables")}>วัสดุสิ้นเปลือง</button>
        <button className={`tab-btn ${sub === "equipment" ? "active" : ""}`} onClick={() => setSub("equipment")}>ครุภัณฑ์ / อุปกรณ์</button>
        <button className={`tab-btn ${sub === "requests" ? "active" : ""}`} onClick={() => setSub("requests")}>คำขอเบิกวัสดุ</button>
      </div>

      {sub === "consumables" && (
        <>
          <div className="toolbar">
            <span className="count">คลัง: {warehouses.map((w) => w.name).join(", ")}</span>
            {canManageWarehouses && <button className="btn ghost small" onClick={onAddWarehouse}><Warehouse size={14} /> เพิ่มคลัง</button>}
          </div>
          {role === "store" ? (
            <>
              <div className="field-mode-note">โหมดหน้างาน — กด + / − เพื่อปรับยอดคงเหลือทันทีตอนรับ-จ่ายของจริง</div>
              <div className="card-list">
                {materials.map((m) => {
                  const low = m.qty <= m.min;
                  const wh = warehouses.find((w) => w.id === m.warehouse);
                  return (
                    <div className="field-card" key={m.id}>
                      <div className="fc-top">
                        <div><div className="fc-title">{m.name}</div><div className="fc-id">{m.category} · {wh?.name || "—"}</div></div>
                        {low ? <StatusTag status="ชำรุด" /> : <StatusTag status="ปกติ" />}
                      </div>
                      <div className="fc-row"><span>คงเหลือ</span>
                        <div className="stock-adjust big">
                          <button onClick={() => onAdjustStock(m.id, -1)}><Minus size={16} /></button>
                          <span className="mono" style={{ color: low ? "#C0392B" : "#1C2B33", fontWeight: 700 }}>{m.qty} {m.unit}</span>
                          <button onClick={() => onAdjustStock(m.id, 1)}><Plus size={16} /></button>
                        </div>
                      </div>
                      <div className="fc-row"><span>จุดสั่งซื้อขั้นต่ำ</span><strong className="mono">{m.min} {m.unit}</strong></div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>รายการวัสดุ</th><th>หมวดหมู่</th><th>คลัง</th><th>คงเหลือ</th><th>จุดสั่งซื้อขั้นต่ำ</th><th>ราคา/หน่วย</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {materials.map((m) => {
                    const low = m.qty <= m.min;
                    const wh = warehouses.find((w) => w.id === m.warehouse);
                    return (
                      <tr key={m.id}>
                        <td><strong>{m.name}</strong></td><td>{m.category}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{wh?.name || "—"}</td>
                        <td>
                          {canEditConsumables ? (
                            <div className="stock-adjust">
                              <button onClick={() => onAdjustStock(m.id, -1)}><Minus size={12} /></button>
                              <span className="mono" style={{ minWidth: 46, textAlign: "center", color: low ? "#C0392B" : "#1C2B33", fontWeight: 600 }}>{m.qty} {m.unit}</span>
                              <button onClick={() => onAdjustStock(m.id, 1)}><Plus size={12} /></button>
                            </div>
                          ) : <span className="mono" style={{ color: low ? "#C0392B" : "#1C2B33", fontWeight: 600 }}>{m.qty} {m.unit}</span>}
                        </td>
                        <td className="mono" style={{ fontSize: 12.5, color: "#6B7680" }}>{m.min} {m.unit}</td>
                        <td className="mono">{baht(m.price)}</td>
                        <td>{low ? <StatusTag status="ชำรุด" /> : <StatusTag status="ปกติ" />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {sub === "equipment" && (
        <>
          <div className="toolbar">
            <span className="count">ครุภัณฑ์ทั้งหมด {equipment.length} รายการ</span>
            {canEditEquipment && <button className="btn accent small" onClick={onAddEquipment}><Plus size={14} /> เพิ่มครุภัณฑ์ (ขออนุมัติจัดซื้อ)</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>รายการ</th><th>หมวดหมู่</th><th>ประจำไซต์</th><th>ผู้ดูแล</th><th>สภาพ</th><th></th></tr></thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td><td>{e.category}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{e.site}</td><td>{e.custodian}</td>
                    <td><StatusTag status={e.condition} /></td>
                    <td>
                      {canEditEquipment && e.condition === "ปกติ" && (
                        <button className="btn small ghost" onClick={() => onFlagEquipment(e.id, "ซ่อมบำรุง", "แจ้งชำรุดจากการตรวจสอบหน้างาน")}>แจ้งชำรุด / ขอส่งซ่อม</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-title"><h2>คำขออนุมัติครุภัณฑ์</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>รายการ</th><th>ประเภทคำขอ</th><th>แจ้งโดย</th><th>วันที่</th><th>หมายเหตุ</th><th>สถานะ</th>{canDecide && <th></th>}</tr></thead>
              <tbody>
                {equipmentApprovals.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.equipmentName}</strong></td><td>{a.type}</td><td>{a.requestedBy}</td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{shortDate(a.date)}</td>
                    <td style={{ color: "#6B7680" }}>{a.note}</td>
                    <td><StatusTag status={a.status} /></td>
                    {canDecide && (
                      <td>
                        {a.status === "รออนุมัติ" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn small success" onClick={() => onDecideApproval(a.id, "อนุมัติ")}><Check size={12} /> อนุมัติ</button>
                            <button className="btn small danger-outline" onClick={() => onDecideApproval(a.id, "ปฏิเสธ")}><Ban size={12} /> ปฏิเสธ</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {equipmentApprovals.length === 0 && <tr><td colSpan={7} className="empty-note">ไม่มีคำขอ</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sub === "requests" && (
        role === "store" ? (
          <>
            <div className="field-mode-note">โหมดหน้างาน — เตรียมของแล้วกดยืนยันจ่ายเพื่อตัดสต็อกทันที</div>
            <div className="card-list">
              {resourceRequests.map((r) => (
                <div className="field-card" key={r.id}>
                  <div className="fc-top">
                    <div><div className="fc-title">{r.material}</div><div className="fc-id">{r.id} · โครงการ {r.project}</div></div>
                    <StatusTag status={r.status} />
                  </div>
                  <div className="fc-row"><span>จำนวนที่ขอ</span><strong className="mono">{r.qty} {r.unit}</strong></div>
                  <div className="fc-row"><span>ผู้ขอ</span><strong>{r.requestedBy}</strong></div>
                  <div className="fc-row"><span>ต้องการภายใน</span><strong className="mono">{shortDate(r.neededDate)}</strong></div>
                  {r.status === "รอดำเนินการ" && <button className="btn accent big" onClick={() => onFulfillRequest(r.id)}><Check size={16} /> ยืนยันจ่ายของแล้ว</button>}
                </div>
              ))}
              {resourceRequests.length === 0 && <div className="empty-note">ไม่มีคำขอค้างอยู่</div>}
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>เลขที่คำขอ</th><th>โครงการ</th><th>ผู้ขอ</th><th>วัสดุ</th><th>จำนวน</th><th>ต้องการภายใน</th><th>สถานะ</th></tr></thead>
              <tbody>
                {resourceRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td><td className="mono" style={{ fontSize: 12 }}>{r.project}</td><td>{r.requestedBy}</td>
                    <td>{r.material}</td><td className="mono">{r.qty} {r.unit}</td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{shortDate(r.neededDate)}</td>
                    <td><StatusTag status={r.status} /></td>
                  </tr>
                ))}
                {resourceRequests.length === 0 && <tr><td colSpan={7} className="empty-note">ไม่มีคำขอค้างอยู่</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}

/* ---------------------------- DOCUMENTS VIEW ----------------------------- */

function DocumentsView({ role, billing, transactions, monthlyChart, totalIncome, totalExpense, onAddBilling, onMarkPaid, onApproveQuote, onAddTransaction }) {
  const [sub, setSub] = useState("invoice");
  const [openBill, setOpenBill] = useState(null);
  const [printBill, setPrintBill] = useState(null);
  const [printVoucher, setPrintVoucher] = useState(null);
  const net = totalIncome - totalExpense;
  const list = billing.filter((b) => b.kind === sub);

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn ${sub === "invoice" ? "active" : ""}`} onClick={() => setSub("invoice")}>ใบแจ้งหนี้</button>
        <button className={`tab-btn ${sub === "quote" ? "active" : ""}`} onClick={() => setSub("quote")}>ใบเสนอราคา</button>
        <button className={`tab-btn ${sub === "accounting" ? "active" : ""}`} onClick={() => setSub("accounting")}>บัญชีรายรับ-รายจ่าย</button>
      </div>

      {sub === "quote" && (
        <div className="field-mode-note">เสมียนร่างใบเสนอราคา → CEO ต้องอนุมัติก่อนถือว่าพร้อมส่งลูกค้า</div>
      )}

      {(sub === "invoice" || sub === "quote") && (
        <>
          <div className="toolbar"><span />{role === "clerk" && <button className="btn accent" onClick={() => onAddBilling(sub)}><Plus size={15} /> สร้าง{sub === "invoice" ? "ใบแจ้งหนี้" : "ใบเสนอราคา"}</button>}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>โครงการ</th><th>วันที่ออก</th><th>ครบกำหนด</th><th>จำนวนเงิน</th><th>สถานะ</th><th></th></tr></thead>
              <tbody>
                {list.map((b) => (
                  <React.Fragment key={b.id}>
                    <tr>
                      <td className="mono">{b.id}</td><td>{b.client}</td><td className="mono" style={{ fontSize: 12 }}>{b.project}</td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{shortDate(b.date)}</td><td className="mono" style={{ fontSize: 12.5 }}>{shortDate(b.due)}</td>
                      <td className="mono" style={{ fontWeight: 600 }}>{baht(b.amount)}</td><td><StatusTag status={b.status} /></td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn small ghost" onClick={() => setOpenBill(openBill === b.id ? null : b.id)}>{openBill === b.id ? "ซ่อนรายการ" : "ดูรายการแยกประเภท"}</button>
                        <button className="btn small ghost" onClick={() => setPrintBill(b)}><Printer size={12} /> พิมพ์บิล</button>
                        {sub === "invoice" && role === "clerk" && b.status !== "ชำระแล้ว" && <button className="btn small ghost" onClick={() => onMarkPaid(b.id)}>ชำระแล้ว</button>}
                        {sub === "quote" && role === "ceo" && b.status === "ร่าง" && <button className="btn small success" onClick={() => onApproveQuote(b.id)}><Check size={12} /> อนุมัติ</button>}
                      </td>
                    </tr>
                    {openBill === b.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: "6px 12px 18px", background: "rgba(28,43,51,0.02)" }}><BillItemsTable bill={b} /></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {list.length === 0 && <tr><td colSpan={8} className="empty-note">ยังไม่มีรายการ</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sub === "accounting" && (
        <>
          <div className="grid grid-3">
            <div className="card kpi"><Corners /><div className="kpi-label">รายรับรวม</div><div className="kpi-value" style={{ color: "#3F7D58" }}>{baht(totalIncome)}</div></div>
            <div className="card kpi"><Corners /><div className="kpi-label">รายจ่ายรวม</div><div className="kpi-value" style={{ color: "#C0392B" }}>{baht(totalExpense)}</div></div>
            <div className="card kpi"><Corners /><div className="kpi-label">กำไรสุทธิ</div><div className="kpi-value" style={{ color: net >= 0 ? "#3F7D58" : "#C0392B" }}>{baht(net)}</div></div>
          </div>
          <div className="section-title"><h2>รายรับ-รายจ่ายรายเดือน</h2></div>
          <div className="card" style={{ height: 260, padding: "18px 10px 6px" }}>
            <Corners />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,43,51,0.1)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontFamily: "Sarabun", fontSize: 12, fill: "#6B7680" }} axisLine={{ stroke: "rgba(28,43,51,0.2)" }} tickLine={false} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#6B7680" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => baht(v)} contentStyle={{ fontFamily: "Sarabun", fontSize: 12.5, border: "1px solid #1C2B33", borderRadius: 0 }} />
                <Bar dataKey="รายรับ" fill="#3F7D58" radius={[2, 2, 0, 0]} />
                <Bar dataKey="รายจ่าย" fill="#E8641C" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="toolbar" style={{ marginTop: 26 }}><span />{role === "clerk" && <button className="btn accent" onClick={onAddTransaction}><Plus size={15} /> บันทึกรายการ</button>}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>วันที่</th><th>ประเภท</th><th>หมวดหมู่</th><th>โครงการ</th><th>รายละเอียด</th><th>จำนวนเงิน</th><th></th></tr></thead>
              <tbody>
                {transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((t) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{shortDate(t.date)}</td>
                    <td>{t.type === "income" ? <span className="tag" style={{ background: "#E5F0E8", color: "#2E5C40" }}><TrendingUp size={11} />รายรับ</span> : <span className="tag" style={{ background: "#F9E4E1", color: "#A6362A" }}><TrendingDown size={11} />รายจ่าย</span>}</td>
                    <td>{t.category}</td><td className="mono" style={{ fontSize: 12 }}>{t.project}</td><td style={{ color: "#6B7680" }}>{t.note}</td>
                    <td className="mono" style={{ fontWeight: 600, color: t.type === "income" ? "#3F7D58" : "#C0392B" }}>{t.type === "income" ? "+" : "-"}{baht(t.amount)}</td>
                    <td>{t.type === "expense" && <button className="btn small ghost" onClick={() => setPrintVoucher(t)}><Printer size={12} /> พิมพ์ใบเบิกเงิน</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {printBill && <PrintModal title={`${printBill.kind === "invoice" ? "ใบแจ้งหนี้" : "ใบเสนอราคา"} ${printBill.id}`} onClose={() => setPrintBill(null)}><PrintableBillDocument bill={printBill} /></PrintModal>}
      {printVoucher && <PrintModal title={`ใบเบิกเงิน ${printVoucher.id}`} onClose={() => setPrintVoucher(null)}><PrintableExpenseVoucher tx={printVoucher} /></PrintModal>}
    </>
  );
}

/* -------------------------------- TEAM ---------------------------------- */

function TeamView({ role, team, subcontractors, projects, onAdd, onAddSubcontractor }) {
  const [sub, setSub] = useState("team");
  const [specialty, setSpecialty] = useState("ทั้งหมด");
  const filteredSubs = specialty === "ทั้งหมด" ? subcontractors : subcontractors.filter((s) => s.specialty === specialty);

  return (
    <>
      <div className="tabs">
        <button className={`tab-btn ${sub === "team" ? "active" : ""}`} onClick={() => setSub("team")}>ทีมช่างบริษัท</button>
        <button className={`tab-btn ${sub === "sub" ? "active" : ""}`} onClick={() => setSub("sub")}>ผู้รับเหมาเฉพาะทาง</button>
      </div>

      {sub === "team" && (
        <>
          <div className="toolbar"><span className="count">ช่างและแรงงานทั้งหมด {team.length} คน</span>{role === "supervisor" && <button className="btn accent" onClick={onAdd}><Plus size={15} /> เพิ่มช่าง / แรงงาน</button>}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>โครงการที่มอบหมาย</th><th>ค่าแรง/วัน</th><th>สถานะ</th><th>ติดต่อ</th></tr></thead>
              <tbody>
                {team.map((w) => (
                  <tr key={w.id}>
                    <td><strong>{w.name}</strong></td><td>{w.role}</td><td className="mono" style={{ fontSize: 12 }}>{w.project || "—"}</td>
                    <td className="mono">{baht(w.wage)}</td><td><StatusTag status={w.status} /></td>
                    <td style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6B7680" }}><Phone size={12} /> {w.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sub === "sub" && (
        <>
          <div className="field-mode-note">แยกข้อมูลตามด้านความเชี่ยวชาญ เพื่อไม่ให้ข้อมูลผู้รับเหมาต่างสาขาปะปนกัน — เลือกด้านที่ต้องการดูได้จากตัวกรอง</div>
          <div className="toolbar">
            <div className="search-box" style={{ maxWidth: 260 }}>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "'Sarabun', sans-serif", fontSize: 13, width: "100%", background: "transparent" }}>
                <option value="ทั้งหมด">ทุกด้าน ({subcontractors.length})</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s} ({subcontractors.filter((x) => x.specialty === s).length})</option>
                ))}
              </select>
            </div>
            {role === "supervisor" && <button className="btn accent" onClick={onAddSubcontractor}><Plus size={15} /> เพิ่มผู้รับเหมาเฉพาะทาง</button>}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ด้านความเชี่ยวชาญ</th><th>บริษัท/ผู้รับเหมา</th><th>ผู้ติดต่อ</th><th>โครงการ</th><th>มูลค่าว่าจ้าง</th><th>ระยะสัญญา</th><th>สถานะ</th></tr></thead>
              <tbody>
                {filteredSubs.map((s) => (
                  <tr key={s.id}>
                    <td><span className="tag" style={{ background: "#EEF1F2", color: "#1C2B33" }}>{s.specialty}</span></td>
                    <td><strong>{s.company}</strong><div style={{ fontSize: 11.5, color: "#6B7680", display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} /> {s.phone}</div></td>
                    <td>{s.contact}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{s.project}</td>
                    <td className="mono">{baht(s.contractValue)}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{shortDate(s.start)} – {shortDate(s.end)}</td>
                    <td><StatusTag status={s.status} /></td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && <tr><td colSpan={7} className="empty-note">ยังไม่มีผู้รับเหมาด้านนี้</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------ VENDORS VIEW ----------------------------- */

function VendorsView({ role, vendors, onAdd }) {
  const [userLocation, setUserLocation] = useState(loadMyLoc);
  const [manualText, setManualText] = useState("");
  const [manualSaved, setManualSaved] = useState(() => !!loadMyLoc());
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [categoryFilter, setCategoryFilter] = useState("ทั้งหมด");

  const requestLocation = () => {
    setLocating(true); setLocationError(null);
    if (!navigator.geolocation) { setLocationError("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง"); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setManualSaved(false); setLocating(false); },
      (err) => {
        setLocationError(err && err.code === 1
          ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาอนุญาตในเบราว์เซอร์ หรือเปิดสิทธิ์ตำแหน่งของแอปในการตั้งค่าเครื่อง"
          : "หาตำแหน่งของเครื่องไม่ได้ — ตั้งตำแหน่งของคุณเองได้ที่ช่อง \"ตั้งตำแหน่งเอง\" ด้านล่าง (วางพิกัดจาก Google Maps)");
        setLocating(false);
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  const refPoint = userLocation || COMPANY_LOCATION;
  const filtered = vendors
    .filter((v) => typeFilter === "ทั้งหมด" || v.type === typeFilter)
    .filter((v) => categoryFilter === "ทั้งหมด" || v.category === categoryFilter)
    .map((v) => ({ ...v, distance: haversineKm(refPoint, v) }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <>
      <div className="field-mode-note">
        {userLocation
          ? (manualSaved ? "เรียงตามระยะทางจากตำแหน่งที่คุณตั้งไว้เอง" : "เรียงตามระยะทางจากตำแหน่งปัจจุบันของคุณ")
          : "ยังไม่ได้เปิดตำแหน่งของคุณ — เรียงตามระยะทางจากสำนักงานบริษัทชั่วคราว"}
      </div>
      <div className="alert-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#fff", border: "1px dashed #B9B6AA" }}>
        <span style={{ fontSize: 13 }}><strong>ตั้งตำแหน่งเอง</strong> (ใช้เมื่อเครื่องหาตำแหน่งไม่ได้):</span>
        <input
          value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="วางพิกัด เช่น 7.8881, 98.3512"
          style={{ flex: "1 1 220px", minWidth: 180, padding: "6px 8px", border: "1px solid #B9B6AA", font: "inherit", fontSize: 13 }}
        />
        <button className="btn ghost" onClick={() => {
          const v = parseLatLng(manualText);
          if (!v) { setLocationError("พิกัดไม่ถูกต้อง ให้คัดลอกตัวเลขพิกัดจาก Google Maps เช่น 7.8881, 98.3512"); return; }
          saveMyLoc(v); setUserLocation(v); setManualSaved(true); setLocationError(null); setManualText("");
        }}>ใช้พิกัดนี้</button>
        {manualSaved && <button className="btn ghost" onClick={() => { saveMyLoc(null); setUserLocation(null); setManualSaved(false); }}>ล้างตำแหน่งที่ตั้งไว้</button>}
        <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>เปิด Google Maps เพื่อคัดลอกพิกัด</a>
      </div>
      <div className="toolbar">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="search-box" style={{ maxWidth: 200 }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "'Sarabun', sans-serif", fontSize: 13, width: "100%", background: "transparent" }}>
              <option value="ทั้งหมด">ทุกประเภทร้าน</option>
              {VENDOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="search-box" style={{ maxWidth: 200 }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ border: "none", outline: "none", fontFamily: "'Sarabun', sans-serif", fontSize: 13, width: "100%", background: "transparent" }}>
              <option value="ทั้งหมด">ทุกหมวดหมู่</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={requestLocation} disabled={locating}>
            <Navigation size={14} /> {locating ? "กำลังค้นหาตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบันของฉัน"}
          </button>
          {(role === "store" || role === "clerk") && <button className="btn accent" onClick={onAdd}><Plus size={15} /> เพิ่มร้านค้า</button>}
        </div>
      </div>
      {locationError && <div className="alert-row danger"><AlertTriangle size={14} color="#C0392B" />{locationError}</div>}

      <div className="card-list">
        {filtered.map((v) => {
          const open = isOpenNow(v.openTime, v.closeTime);
          return (
            <div className="field-card" key={v.id}>
              <div className="fc-top">
                <div>
                  <div className="fc-title">{v.name}</div>
                  <div className="fc-id">{v.type} · {v.category}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StatusTag status={open ? "เปิดอยู่" : "ปิดแล้ว"} />
                  <span className="mono" style={{ fontSize: 12, color: "#6B7680" }}>{v.distance.toFixed(1)} กม.</span>
                </div>
              </div>
              <div className="fc-row"><span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> ที่อยู่</span><strong style={{ textAlign: "right", maxWidth: "70%" }}>{v.address}</strong></div>
              <div className="fc-row"><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} /> เวลาทำการ</span><strong className="mono">{v.openTime}–{v.closeTime} น. ({v.days})</strong></div>
              <div className="fc-row"><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={13} /> โทรศัพท์</span><strong className="mono">{v.phone}</strong></div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="empty-note">ไม่พบร้านค้าที่ตรงกับเงื่อนไข</div>}
      </div>
    </>
  );
}

/* --------------------------------- FORMS --------------------------------- */

function ProjectForm({ onSubmit, onClose }) {
  const [f, setF] = useState({ name: "", client: "", supervisor: "", budget: "", start: "", end: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="เพิ่มโครงการใหม่" onClose={onClose}>
      <div className="field"><label>ชื่อโครงการ</label><input value={f.name} onChange={set("name")} /></div>
      <div className="field"><label>ชื่อลูกค้า</label><input value={f.client} onChange={set("client")} /></div>
      <div className="field"><label>หัวหน้างานที่รับผิดชอบ</label><input value={f.supervisor} onChange={set("supervisor")} /></div>
      <div className="field-row"><div className="field"><label>งบประมาณ (บาท)</label><input type="number" value={f.budget} onChange={set("budget")} /></div><div className="field"><label>วันที่เริ่ม</label><input type="date" value={f.start} onChange={set("start")} /></div></div>
      <div className="field"><label>กำหนดส่งงาน</label><input type="date" value={f.end} onChange={set("end")} /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.name || !f.client} onClick={() => onSubmit({ ...f, budget: Number(f.budget) || 0 })}>บันทึกโครงการ</button>
    </Modal>
  );
}

function WorkerForm({ projects, onSubmit, onClose }) {
  const [f, setF] = useState({ name: "", role: "แรงงานทั่วไป", project: "", wage: "", phone: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="เพิ่มช่าง / แรงงาน" onClose={onClose}>
      <div className="field"><label>ชื่อ-นามสกุล</label><input value={f.name} onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label>ตำแหน่ง</label><select value={f.role} onChange={set("role")}>{["หัวหน้างาน", "ช่างปูน", "ช่างเหล็ก", "ช่างไฟฟ้า", "ช่างประปา", "แรงงานทั่วไป"].map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label>ค่าแรง/วัน (บาท)</label><input type="number" value={f.wage} onChange={set("wage")} /></div>
      </div>
      <div className="field"><label>มอบหมายโครงการ</label><select value={f.project} onChange={set("project")}><option value="">— ยังไม่มอบหมาย —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></div>
      <div className="field"><label>เบอร์โทรศัพท์</label><input value={f.phone} onChange={set("phone")} /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.name} onClick={() => onSubmit({ ...f, wage: Number(f.wage) || 0, project: f.project || null })}>บันทึกข้อมูล</button>
    </Modal>
  );
}

function SubcontractorForm({ projects, onSubmit, onClose }) {
  const [f, setF] = useState({ specialty: SPECIALTIES[0], company: "", contact: "", phone: "", project: "", contractValue: "", start: "", end: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="เพิ่มผู้รับเหมาเฉพาะทาง" onClose={onClose}>
      <div className="field">
        <label>ด้านความเชี่ยวชาญ</label>
        <select value={f.specialty} onChange={set("specialty")}>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="field"><label>ชื่อบริษัท / ผู้รับเหมา</label><input value={f.company} onChange={set("company")} placeholder="เช่น หจก. ไฟฟ้าเจริญพาณิชย์" /></div>
      <div className="field-row">
        <div className="field"><label>ชื่อผู้ติดต่อ</label><input value={f.contact} onChange={set("contact")} /></div>
        <div className="field"><label>เบอร์โทรศัพท์</label><input value={f.phone} onChange={set("phone")} /></div>
      </div>
      <div className="field">
        <label>โครงการที่ว่าจ้าง</label>
        <select value={f.project} onChange={set("project")}>
          <option value="">เลือกโครงการ</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
        </select>
      </div>
      <div className="field-row">
        <div className="field"><label>มูลค่าว่าจ้าง (บาท)</label><input type="number" value={f.contractValue} onChange={set("contractValue")} /></div>
        <div className="field"><label>เริ่มงาน</label><input type="date" value={f.start} onChange={set("start")} /></div>
      </div>
      <div className="field"><label>สิ้นสุดสัญญา (คาดการณ์)</label><input type="date" value={f.end} onChange={set("end")} /></div>
      <button
        className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        disabled={!f.company || !f.project}
        onClick={() => onSubmit({ ...f, contractValue: Number(f.contractValue) || 0 })}
      >
        บันทึกผู้รับเหมา
      </button>
    </Modal>
  );
}

function VendorForm({ onSubmit, onClose }) {
  const [f, setF] = useState({ name: "", type: VENDOR_TYPES[0], category: VENDOR_CATEGORIES[0], address: "", phone: "", openTime: "08:00", closeTime: "18:00", days: "ทุกวัน" });
  const [coord, setCoord] = useState("");
  const coordBad = coord.trim() !== "" && !parseLatLng(coord);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="เพิ่มร้านค้า / ร้านซ่อม" onClose={onClose}>
      <div className="field"><label>ชื่อร้าน</label><input value={f.name} onChange={set("name")} /></div>
      <div className="field-row">
        <div className="field"><label>ประเภท</label><select value={f.type} onChange={set("type")}>{VENDOR_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label>หมวดหมู่</label><select value={f.category} onChange={set("category")}>{VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="field"><label>ที่อยู่ร้าน</label><input value={f.address} onChange={set("address")} /></div>
      <div className="field"><label>เบอร์โทรศัพท์</label><input value={f.phone} onChange={set("phone")} /></div>
      <div className="field-row">
        <div className="field"><label>เวลาเปิด</label><input type="time" value={f.openTime} onChange={set("openTime")} /></div>
        <div className="field"><label>เวลาปิด</label><input type="time" value={f.closeTime} onChange={set("closeTime")} /></div>
      </div>
      <div className="field"><label>วันที่เปิดทำการ</label><input value={f.days} onChange={set("days")} placeholder="เช่น ทุกวัน, จันทร์–เสาร์" /></div>
      <div className="field">
        <label>พิกัดร้าน (ไม่บังคับ)</label>
        <input value={coord} onChange={(e) => setCoord(e.target.value)} placeholder="วางพิกัดจาก Google Maps เช่น 7.8881, 98.3512" />
      </div>
      <p style={{ fontSize: 11.5, color: coordBad ? "#B3261E" : "#6B7680", marginTop: -4 }}>
        {coordBad ? "รูปแบบพิกัดไม่ถูกต้อง ต้องเป็น ละติจูด, ลองจิจูด" : "* ถ้าไม่ใส่พิกัด ระยะทางของร้านจะคำนวณจากตำแหน่งสำนักงานชั่วคราว วิธีหาพิกัด: เปิด Google Maps คลิกขวาที่ร้าน แล้วคลิกตัวเลขพิกัดด้านบนสุดเพื่อคัดลอก"}
      </p>
      <button
        className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        disabled={!f.name || !f.address || coordBad}
        onClick={() => { const c = parseLatLng(coord) || COMPANY_LOCATION; onSubmit({ ...f, lat: c.lat, lng: c.lng }); }}
      >
        บันทึกร้านค้า
      </button>
    </Modal>
  );
}

function BillingForm({ kind, projects, onSubmit, onClose }) {
  const [f, setF] = useState({ client: "", project: "", amount: "", date: "", due: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={kind === "invoice" ? "สร้างใบแจ้งหนี้" : "สร้างใบเสนอราคา"} onClose={onClose}>
      <div className="field"><label>ชื่อลูกค้า</label><input value={f.client} onChange={set("client")} /></div>
      <div className="field"><label>โครงการที่เกี่ยวข้อง</label><select value={f.project} onChange={set("project")}><option value="">เลือกโครงการ</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></div>
      <div className="field-row"><div className="field"><label>วันที่ออกเอกสาร</label><input type="date" value={f.date} onChange={set("date")} /></div><div className="field"><label>ครบกำหนด</label><input type="date" value={f.due} onChange={set("due")} /></div></div>
      <div className="field"><label>จำนวนเงิน (บาท)</label><input type="number" value={f.amount} onChange={set("amount")} /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.client || !f.amount} onClick={() => onSubmit({ ...f, amount: Number(f.amount) || 0 })}>บันทึกเอกสาร</button>
    </Modal>
  );
}

function TransactionForm({ projects, onSubmit, onClose }) {
  const [f, setF] = useState({ type: "expense", category: "", project: "", amount: "", date: "", note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="บันทึกรายการรับ-จ่าย" onClose={onClose}>
      <div className="field-row">
        <div className="field"><label>ประเภท</label><select value={f.type} onChange={set("type")}><option value="income">รายรับ</option><option value="expense">รายจ่าย</option></select></div>
        <div className="field"><label>จำนวนเงิน (บาท)</label><input type="number" value={f.amount} onChange={set("amount")} /></div>
      </div>
      <div className="field"><label>หมวดหมู่</label><input value={f.category} onChange={set("category")} /></div>
      <div className="field"><label>โครงการที่เกี่ยวข้อง</label><select value={f.project} onChange={set("project")}><option value="">เลือกโครงการ</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></div>
      <div className="field"><label>วันที่</label><input type="date" value={f.date} onChange={set("date")} /></div>
      <div className="field"><label>หมายเหตุ</label><input value={f.note} onChange={set("note")} /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.category || !f.amount || !f.date} onClick={() => onSubmit({ ...f, amount: Number(f.amount) || 0 })}>บันทึกรายการ</button>
    </Modal>
  );
}

function WarehouseForm({ onSubmit, onClose }) {
  const [f, setF] = useState({ name: "" });
  return (
    <Modal title="เพิ่มคลังใหม่" onClose={onClose}>
      <div className="field"><label>ชื่อคลัง / ตำแหน่งที่ตั้ง</label><input value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="เช่น คลังไซต์งาน จ. เชียงราย" /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.name} onClick={() => onSubmit(f)}>บันทึกคลัง</button>
    </Modal>
  );
}

function ResourceRequestForm({ projects, materials, onSubmit, onClose }) {
  const [f, setF] = useState({ project: "", requestedBy: "", material: "", qty: "", unit: "", neededDate: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="ส่งคำขอวัสดุ" onClose={onClose}>
      <div className="field"><label>โครงการ</label><select value={f.project} onChange={set("project")}><option value="">เลือกโครงการ</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></div>
      <div className="field"><label>ชื่อผู้ขอ (หัวหน้างาน)</label><input value={f.requestedBy} onChange={set("requestedBy")} /></div>
      <div className="field"><label>วัสดุที่ต้องการ</label><select value={f.material} onChange={set("material")}><option value="">เลือกวัสดุ</option>{materials.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
      <div className="field-row">
        <div className="field"><label>จำนวน</label><input type="number" value={f.qty} onChange={set("qty")} /></div>
        <div className="field"><label>หน่วย</label><input value={f.unit} onChange={set("unit")} placeholder="เช่น ถุง, เส้น" /></div>
      </div>
      <div className="field"><label>ต้องการภายในวันที่</label><input type="date" value={f.neededDate} onChange={set("neededDate")} /></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.project || !f.material || !f.qty} onClick={() => onSubmit({ ...f, qty: Number(f.qty) || 0 })}>ส่งคำขอ</button>
    </Modal>
  );
}

function EquipmentForm({ projects, onSubmit, onClose }) {
  const [f, setF] = useState({ name: "", category: "", site: "", custodian: "อรวรรณ (เสมียน)" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="เพิ่มครุภัณฑ์ใหม่ (รอ CEO อนุมัติจัดซื้อ)" onClose={onClose}>
      <div className="field"><label>ชื่อครุภัณฑ์</label><input value={f.name} onChange={set("name")} /></div>
      <div className="field"><label>หมวดหมู่</label><input value={f.category} onChange={set("category")} placeholder="เช่น เครื่องมือไฟฟ้า, เครื่องจักร" /></div>
      <div className="field"><label>ประจำไซต์งาน</label><select value={f.site} onChange={set("site")}><option value="คลังหลัก">คลังหลัก</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></div>
      <button className="btn accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={!f.name} onClick={() => onSubmit(f)}>ส่งคำขอจัดซื้อ</button>
    </Modal>
  );
}

/* ============================================================
   CLIENT PORTAL — external, read-only view for customers
   ============================================================ */

function ClientPortal({ onBackToLanding }) {
  const [session, setSession] = useState(null); // { clientName }
  const [selectedProject, setSelectedProject] = useState(null);

  const clientProjects = session
    ? initialProjects.filter((p) => p.client === session.clientName)
    : [];

  return (
    <div className="client-root">
      <style>{`
        .client-root * { box-sizing: border-box; }
        .client-root {
          --ink: #1C2B33; --steel: #6B7680; --line: rgba(28,43,51,0.13); --paper: #F3F2EC; --surface: #FFFFFF;
          --accent: #E8641C; --accent-dark: #C24F14; --success: #3F7D58; --caution: #D4A017; --danger: #C0392B;
          font-family: 'Sarabun', sans-serif; color: var(--ink); background: var(--paper); min-height: 100%;
        }
        .client-root h1, .client-root h2, .client-root h3 { font-family: 'Bai Jamjuree', sans-serif; }
        .client-root .mono { font-family: 'JetBrains Mono', monospace; }
        .c-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: var(--ink); color: #fff; }
        .c-topbar .mark { display: flex; align-items: center; gap: 8px; font-family: 'Bai Jamjuree', sans-serif; font-weight: 700; font-size: 16px; }
        .c-topbar .mark span.sq { width: 9px; height: 9px; background: var(--accent); display: inline-block; }
        .c-topbar .who { font-size: 12.5px; color: #C7CDD1; display: flex; align-items: center; gap: 12px; }
        .c-topbar button { background: transparent; border: 1px solid rgba(255,255,255,0.25); color: #E8E6DF; padding: 6px 12px; border-radius: 3px; font-family: 'Bai Jamjuree', sans-serif; font-size: 12.5px; cursor: pointer; }
        .c-topbar button:hover { border-color: var(--accent); color: #fff; }
        .c-wrap { max-width: 760px; margin: 0 auto; padding: 28px 20px 60px; }
        .c-login-wrap { max-width: 360px; margin: 60px auto; padding: 0 20px; }
        .c-card { position: relative; background: var(--surface); border: 1px solid var(--line); padding: 20px 22px; margin-bottom: 16px; }
        .c-corner { position: absolute; width: 9px; height: 9px; border: 2px solid var(--accent); opacity: 0.85; }
        .c-corner.tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
        .c-corner.br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
        .c-eyebrow { font-family: 'Bai Jamjuree', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--steel); display: block; margin-bottom: 4px; }
        .c-hero-title { font-size: 21px; font-weight: 600; margin: 0 0 4px; }
        .c-hero-sub { font-size: 13px; color: var(--steel); margin-bottom: 14px; }
        .c-progress-ring-row { display: flex; align-items: center; gap: 18px; }
        .c-progress-track { flex: 1; height: 10px; background: var(--line); border-radius: 6px; overflow: hidden; }
        .c-progress-fill { height: 100%; background: var(--accent); }
        .c-progress-pct { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: var(--accent); }
        .c-field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; }
        .c-field label { font-size: 12px; color: var(--steel); font-family: 'Bai Jamjuree', sans-serif; }
        .c-field input { padding: 11px 12px; border: 1px solid var(--line); border-radius: 3px; font-size: 14px; font-family: 'Sarabun', sans-serif; }
        .c-field input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
        .c-btn { width: 100%; justify-content: center; font-family: 'Bai Jamjuree', sans-serif; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 3px; border: 1px solid var(--accent); background: var(--accent); color: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .c-btn:hover { background: var(--accent-dark); }
        .c-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .c-section-title { font-size: 14.5px; font-weight: 600; margin: 22px 0 10px; display: flex; align-items: center; gap: 7px; }
        .c-phase-list { list-style: none; padding: 0; margin: 0; }
        .c-phase { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; }
        .c-phase-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
        .c-phase-dot.done { background: var(--success); color: #fff; }
        .c-phase-dot.current { background: var(--accent); color: #fff; }
        .c-phase-dot.todo { background: var(--line); color: var(--steel); }
        .c-phase-name { font-size: 13.5px; font-weight: 500; }
        .c-phase-name.todo { color: var(--steel); }
        .c-update { padding: 12px 0; border-bottom: 1px solid var(--line); }
        .c-update:last-child { border-bottom: none; }
        .c-update-date { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--accent); margin-bottom: 3px; }
        .c-update-text { font-size: 13.5px; line-height: 1.5; }
        .c-pay-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
        .c-pay-row:last-child { border-bottom: none; font-weight: 700; }
        .c-doc-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
        .c-doc-row:last-child { border-bottom: none; }
        .c-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
        .c-contact { display: flex; align-items: center; gap: 12px; }
        .c-contact .avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Bai Jamjuree', sans-serif; font-weight: 600; }
        .c-project-pick { display: flex; flex-direction: column; gap: 10px; }
        .c-project-pick button { text-align: left; background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--accent); padding: 14px 16px; cursor: pointer; font-family: 'Sarabun', sans-serif; }
        .c-error { color: var(--danger); font-size: 12.5px; margin-top: -4px; margin-bottom: 10px; }
      `}</style>

      <div className="c-topbar">
        <div className="mark"><span className="sq" />ไทยโครงสร้าง <span style={{ fontWeight: 400, color: "#9AA6AC" }}>· พอร์ทัลลูกค้า</span></div>
        {session ? (
          <div className="who">
            สวัสดีคุณ {session.clientName}
            <button onClick={() => { setSession(null); setSelectedProject(null); }}>ออกจากระบบ</button>
          </div>
        ) : (
          <button onClick={onBackToLanding}>← กลับหน้าเลือกผู้ใช้งาน</button>
        )}
      </div>

      {!session && <ClientLogin onLogin={setSession} />}

      {session && !selectedProject && (
        <div className="c-wrap">
          <div className="c-eyebrow">โครงการของคุณ</div>
          <h2 style={{ marginTop: 0 }}>เลือกโครงการที่ต้องการดูความคืบหน้า</h2>
          <div className="c-project-pick">
            {clientProjects.map((p) => (
              <button key={p.id} onClick={() => setSelectedProject(p)}>
                <strong>{p.name}</strong>
                <div className="mono" style={{ fontSize: 12, color: "#6B7680", marginTop: 4 }}>สถานะ: {p.status} · ความคืบหน้า {p.progress}%</div>
              </button>
            ))}
            {clientProjects.length === 0 && <div style={{ color: "#6B7680", fontSize: 13.5 }}>ไม่พบโครงการที่ผูกกับบัญชีนี้</div>}
          </div>
        </div>
      )}

      {session && selectedProject && (
        <ClientProjectDetail project={selectedProject} onChangeProject={clientProjects.length > 1 ? () => setSelectedProject(null) : null} />
      )}
    </div>
  );
}

function ClientLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const found = clientAccounts.find((a) => a.username === username.trim() && a.password === password);
    if (found) { setError(""); onLogin(found); }
    else setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  };

  return (
    <div className="c-login-wrap">
      <div className="c-card">
        <div className="c-corner tl" /><div className="c-corner br" />
        <div className="c-eyebrow">เข้าสู่ระบบลูกค้า</div>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>ติดตามความคืบหน้างานของคุณ</h2>
        <p style={{ fontSize: 12.5, color: "#6B7680", marginTop: 0, marginBottom: 18 }}>กรอกชื่อผู้ใช้และรหัสผ่านที่บริษัทมอบให้เมื่อเริ่มโครงการ</p>
        <div className="c-field"><label>ชื่อผู้ใช้</label><input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
        <div className="c-field"><label>รหัสผ่าน</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
        {error && <div className="c-error">{error}</div>}
        <button className="c-btn" onClick={submit} disabled={!username || !password}>เข้าสู่ระบบ</button>
        <p style={{ fontSize: 11.5, color: "#9AA6AC", marginTop: 14, marginBottom: 0 }}>
          บัญชีสำหรับทดสอบระบบ — ชื่อผู้ใช้: <span className="mono">somchai</span>  รหัสผ่าน: <span className="mono">1234</span>
        </p>
      </div>
    </div>
  );
}

function ClientProjectDetail({ project, onChangeProject }) {
  const phasesCompleted = Math.round((project.progress / 100) * PHASE_TEMPLATE.length);
  const updates = siteUpdatesData[project.id] || [];
  const clientBilling = initialBilling.filter((b) => b.project === project.id);
  const invoices = clientBilling.filter((b) => b.kind === "invoice");
  const totalInvoiced = invoices.reduce((s, b) => s + b.amount, 0);
  const totalPaid = invoices.filter((b) => b.status === "ชำระแล้ว").reduce((s, b) => s + b.amount, 0);
  const totalDue = totalInvoiced - totalPaid;
  const supervisorWorker = initialTeam.find((w) => w.name === project.supervisor);
  const [openInvoice, setOpenInvoice] = useState(null);

  return (
    <div className="c-wrap">
      {onChangeProject && <button onClick={onChangeProject} style={{ background: "none", border: "none", color: "#6B7680", fontSize: 12.5, cursor: "pointer", marginBottom: 10, padding: 0 }}>← เลือกโครงการอื่น</button>}

      <div className="c-card">
        <div className="c-corner tl" /><div className="c-corner br" />
        <span className="c-eyebrow">{project.id} · {project.client}</span>
        <div className="c-hero-title">{project.name}</div>
        <div className="c-hero-sub">กำหนดส่งมอบ {shortDate(project.end)} · สถานะ: {project.status}</div>
        <div className="c-progress-ring-row">
          <div className="c-progress-track"><div className="c-progress-fill" style={{ width: `${project.progress}%` }} /></div>
          <div className="c-progress-pct">{project.progress}%</div>
        </div>
      </div>

      <div className="c-section-title"><HardHat size={16} color="#E8641C" /> ขั้นตอนงานก่อสร้าง</div>
      <div className="c-card">
        <ul className="c-phase-list">
          {PHASE_TEMPLATE.map((phase, i) => {
            const state = i < phasesCompleted ? "done" : i === phasesCompleted ? "current" : "todo";
            return (
              <li className="c-phase" key={phase}>
                <div className={`c-phase-dot ${state}`}>{state === "done" ? "✓" : i + 1}</div>
                <div className={`c-phase-name ${state === "todo" ? "todo" : ""}`}>{phase}{state === "current" && <span style={{ color: "#E8641C", fontSize: 11.5, marginLeft: 8 }}>· กำลังดำเนินการ</span>}</div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="c-section-title"><ClipboardList size={16} color="#E8641C" /> อัปเดตความคืบหน้าล่าสุด</div>
      <div className="c-card">
        {updates.length > 0 ? updates.map((u, i) => (
          <div className="c-update" key={i}><div className="c-update-date">{shortDate(u.date)}</div><div className="c-update-text">{u.text}</div></div>
        )) : <div style={{ fontSize: 13, color: "#6B7680" }}>ยังไม่มีอัปเดตจากหน้างาน</div>}
      </div>

      <div className="c-section-title"><Wallet size={16} color="#E8641C" /> สรุปการชำระเงิน</div>
      <div className="c-card">
        <div className="c-pay-row"><span>มูลค่างานที่แจ้งหนี้แล้ว</span><span className="mono">{baht(totalInvoiced)}</span></div>
        <div className="c-pay-row"><span>ชำระแล้ว</span><span className="mono" style={{ color: "#3F7D58" }}>{baht(totalPaid)}</span></div>
        <div className="c-pay-row"><span>คงค้างชำระ</span><span className="mono" style={{ color: totalDue > 0 ? "#C0392B" : "#3F7D58" }}>{baht(totalDue)}</span></div>
      </div>

      {invoices.length > 0 && (
        <>
          <div className="c-section-title"><Receipt size={16} color="#E8641C" /> ใบแจ้งหนี้ของคุณ (ยอดแยกรายการ)</div>
          <div className="c-card" style={{ padding: 0 }}>
            {invoices.map((b) => (
              <div key={b.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="c-doc-row" style={{ padding: "14px 22px", cursor: "pointer" }} onClick={() => setOpenInvoice(openInvoice === b.id ? null : b.id)}>
                  <div><strong>{b.id}</strong><div className="mono" style={{ fontSize: 11.5, color: "#6B7680" }}>ครบกำหนด {shortDate(b.due)} · {baht(b.amount)}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusTag status={b.status} />
                    <ChevronRight size={15} color="#6B7680" style={{ transform: openInvoice === b.id ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                  </div>
                </div>
                {openInvoice === b.id && <div style={{ padding: "4px 22px 18px" }}><BillItemsTable bill={b} /></div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="c-section-title"><User size={16} color="#E8641C" /> ผู้ดูแลโครงการของคุณ</div>
      <div className="c-card">
        <div className="c-contact">
          <div className="avatar">{project.supervisor?.[0] || "?"}</div>
          <div>
            <strong style={{ fontSize: 14 }}>{project.supervisor}</strong>
            <div style={{ fontSize: 12.5, color: "#6B7680" }}>หัวหน้างานประจำโครงการ{supervisorWorker ? ` · ${supervisorWorker.phone}` : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ LANDING ---------------------------------- */

function Landing({ onChoose, demo }) {
  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          min-height: 100vh; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          font-family: 'Sarabun', sans-serif; padding: 32px;
          background: #1C2B33;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 44px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 44px);
        }
        .landing-wrap { max-width: 620px; width: 100%; }
        .landing-mark { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .landing-mark .ruler-badge {
          width: 34px; height: 34px; border: 1.5px solid #E8641C; border-radius: 3px;
          display: flex; align-items: center; justify-content: center; color: #E8641C; flex-shrink: 0;
        }
        .landing-mark .name { font-family: 'Bai Jamjuree', sans-serif; font-weight: 700; font-size: 24px; color: #fff; }
        .landing-tagline { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6B7680; letter-spacing: 0.04em; margin: 0 0 40px 44px; }
        .landing-prompt { color: #C7CDD1; font-size: 14.5px; margin-bottom: 20px; }
        .landing-cards { display: flex; gap: 14px; flex-wrap: wrap; }
        .landing-card {
          position: relative; flex: 1 1 260px; text-align: left; cursor: pointer;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.14);
          padding: 24px 22px; font-family: 'Sarabun', sans-serif; transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .landing-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .landing-card.primary { border-color: rgba(232,100,28,0.45); }
        .landing-card.primary:hover { border-color: #E8641C; }
        .landing-card.secondary:hover { border-color: #3E7FAD; }
        .landing-card .lc-icon { width: 38px; height: 38px; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .landing-card.primary .lc-icon { background: rgba(232,100,28,0.15); color: #E8641C; }
        .landing-card.secondary .lc-icon { background: rgba(62,127,173,0.18); color: #6FB2E0; }
        .landing-card .lc-title { font-family: 'Bai Jamjuree', sans-serif; font-weight: 600; font-size: 16px; color: #fff; margin-bottom: 6px; }
        .landing-card .lc-desc { font-size: 12.5px; color: #9AA6AC; line-height: 1.5; }
        .landing-corner { position: absolute; width: 9px; height: 9px; opacity: 0.9; }
        .landing-card.primary .landing-corner { border-color: #E8641C; }
        .landing-card.secondary .landing-corner { border-color: #3E7FAD; }
        .lc-tl { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
        .lc-br { bottom: -1px; right: -1px; border-bottom: 2px solid; border-right: 2px solid; }
        .landing-foot { margin-top: 28px; font-size: 11.5px; color: #5C6870; }
        @media (max-width: 560px) { .landing-cards { flex-direction: column; } }
      `}</style>

      <div className="landing-wrap">
        <div className="landing-mark">
          <span className="ruler-badge"><Ruler size={17} /></span>
          <span className="name">ไทยโครงสร้าง</span>
        </div>
        <div className="landing-tagline">ระบบจัดการรับเหมาก่อสร้าง</div>

        <div className="landing-prompt">เข้าสู่ระบบในฐานะ</div>
        <div className="landing-cards">
          <div className="landing-card primary" onClick={() => onChoose("staff")}>
            <span className="landing-corner lc-tl" /><span className="landing-corner lc-br" />
            <div className="lc-icon"><Building2 size={19} /></div>
            <div className="lc-title">พนักงานบริษัท</div>
            <div className="lc-desc">จัดการโครงการ คลังวัสดุ เอกสาร และบัญชี ตามสิทธิ์การใช้งานของตำแหน่งคุณ</div>
          </div>
          {demo && (
          <div className="landing-card secondary" onClick={() => onChoose("client")}>
            <span className="landing-corner lc-tl" /><span className="landing-corner lc-br" />
            <div className="lc-icon"><User size={19} /></div>
            <div className="lc-title">ลูกค้า</div>
            <div className="lc-desc">ติดตามความคืบหน้าและตรวจสอบเอกสารการเงินของโครงการคุณเอง</div>
          </div>
          )}
        </div>
        <div className="landing-foot">{demo ? "เวอร์ชันทดสอบ — ข้อมูลทั้งหมดเป็นตัวอย่างสำหรับสาธิตการทำงาน" : "ไทยโครงสร้าง v1.0"}</div>
      </div>
    </div>
  );
}

/* --------------------------------- ROOT ----------------------------------- */

function StaffApp({ auth, onLogout }) {
  const [boot, setBoot] = useState(null); // { state, demo }
  const [bootErr, setBootErr] = useState("");
  React.useEffect(() => {
    api("/api/state", { token: auth.token })
      .then(setBoot)
      .catch((e) => { if (e.status === 401 || e.status === 403) onLogout(); else setBootErr(e.message); });
    // eslint-disable-next-line
  }, [auth.token]);
  if (bootErr) return <div style={{ padding: 40, fontFamily: "Sarabun, sans-serif" }}><div style={{ color: "#C0392B", marginBottom: 12 }}>{bootErr}</div><button onClick={onLogout}>ออกจากระบบ</button></div>;
  if (!boot) return <div style={{ padding: 40, fontFamily: "Sarabun, sans-serif", color: "#6B7680" }}>กำลังโหลดข้อมูล...</div>;
  return <StaffAppInner auth={auth} onLogout={onLogout} server={boot.state || {}} demo={!!boot.demo} />;
}


function StaffLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // { needsSetup, demo }
  React.useEffect(() => { api("/api/setup/status").then(setStatus).catch((e) => setErr(e.message)); }, []);
  const setup = !!(status && status.needsSetup);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      if (setup) {
        if (password !== password2) throw new Error("รหัสผ่านสองช่องไม่ตรงกัน");
        await api("/api/setup", { method: "POST", body: { name, email, password } });
      }
      onLogin(await api("/api/auth/login", { method: "POST", body: { email, password } }));
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const quick = (e) => { setEmail(e); setPassword("Demo1234!"); };
  const valid = setup ? name && email && password.length >= 8 && password2 : email && password;
  return (
    <div className="app-root" style={{ alignItems: "center", justifyContent: "center", padding: 24, minHeight: "100vh" }}>
      <style>{`
        .app-root { --ink:#1C2B33; --steel:#6B7680; --line:rgba(28,43,51,0.14); --paper:#EBEAE4; --accent:#E8641C; --danger:#C0392B; font-family:'Sarabun',sans-serif; background:var(--paper); display:flex; }
        .lg-card { background:#fff; border:1px solid var(--ink); padding:28px; width:380px; max-width:100%; }
        .lg-card h1 { font-family:'Bai Jamjuree',sans-serif; font-size:20px; margin:0 0 4px; }
        .lg-card .field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
        .lg-card label { font-size:12px; color:var(--steel); }
        .lg-card input { padding:9px 10px; border:1px solid var(--line); border-radius:3px; font-size:14px; }
        .lg-card .btn { width:100%; justify-content:center; font-size:14px; padding:10px; border:1px solid var(--accent); background:var(--accent); color:#fff; cursor:pointer; border-radius:3px; }
        .lg-card .btn:disabled { opacity:.5; }
        .lg-demo { display:flex; gap:6px; flex-wrap:wrap; margin-top:14px; }
        .lg-demo button { font-size:11.5px; padding:4px 8px; border:1px solid var(--line); background:#fff; cursor:pointer; border-radius:3px; }
        .lg-err { background:#FDF1EF; border-left:3px solid var(--danger); padding:8px 10px; font-size:13px; margin-bottom:12px; }
        .lg-info { background:#EEF4F8; border-left:3px solid #3E7FAD; padding:8px 10px; font-size:13px; margin-bottom:12px; }
      `}</style>
      <form className="lg-card" onSubmit={submit}>
        <h1>{setup ? "ตั้งค่าครั้งแรก" : "เข้าสู่ระบบพนักงาน"}</h1>
        <div style={{ color: "var(--steel)", fontSize: 12.5, marginBottom: 18 }}>ไทยโครงสร้าง — ระบบจัดการรับเหมาก่อสร้าง</div>
        {setup && <div className="lg-info">ยินดีต้อนรับ! สร้างบัญชีผู้ดูแล (CEO) คนแรกของคุณ จากนั้นเพิ่มบัญชีพนักงานคนอื่นได้ในเมนู "จัดการบัญชีผู้ใช้"</div>}
        {err && <div className="lg-err">{err}</div>}
        {setup && <div className="field"><label>ชื่อของคุณ</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>}
        <div className="field"><label>อีเมล</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!setup} /></div>
        <div className="field"><label>{setup ? "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" : "รหัสผ่าน"}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {setup && <div className="field"><label>ยืนยันรหัสผ่าน</label><input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>}
        <button className="btn" disabled={busy || !valid}>{busy ? "กำลังดำเนินการ..." : setup ? "สร้างบัญชีและเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button>
        {status && status.demo && !setup && (<>
          <div className="lg-demo">
            {[["ceo", "CEO"], ["supervisor", "หัวหน้างาน"], ["store", "สโตร์"], ["clerk", "เสมียน"]].map(([k, l]) => (
              <button type="button" key={k} onClick={() => quick(`${k}@thai.local`)}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--steel)", marginTop: 8 }}>บัญชีทดลอง: กดปุ่มด้านบนเพื่อกรอกอัตโนมัติ (รหัสผ่าน Demo1234!)</div>
        </>)}
        <button type="button" onClick={onBack} style={{ marginTop: 14, background: "none", border: "none", color: "var(--steel)", cursor: "pointer", fontSize: 12.5 }}>← กลับ</button>
      </form>
    </div>
  );
}

export default function ConstructionManager() {
  const [auth, setAuth] = useState(loadAuth);
  const [mode, setMode] = useState(() => (loadAuth() ? "staff" : "landing")); // 'landing' | 'staff' | 'client'
  const [demo, setDemo] = useState(false);
  React.useEffect(() => { api("/api/setup/status").then((r) => setDemo(!!r.demo)).catch(() => {}); }, []);
  const login = (a) => { saveAuth(a); setAuth(a); };
  const logout = () => { saveAuth(null); setAuth(null); setMode("landing"); };
  if (mode === "landing") return <Landing onChoose={setMode} demo={demo} />;
  if (mode === "client") return <ClientPortal onBackToLanding={() => setMode("landing")} />;
  if (!auth) return <StaffLogin onLogin={login} onBack={() => setMode("landing")} />;
  return <StaffApp auth={auth} onLogout={logout} />;
}
