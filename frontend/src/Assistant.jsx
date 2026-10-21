// Assistant.jsx — ผู้ช่วยในแอป: ตอบวิธีใช้/ปัญหาที่พบบ่อย + ปุ่มเดียวตรวจระบบ แก้ที่ปลอดภัย และสร้างรายงาน
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { QUICK, ask } from "./assistantKb.js";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function call(path, token, { method = "GET", body } = {}) {
  const res = await fetch(API_URL + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
  return data;
}

const ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle };
const COLOR = { ok: "#3F7D58", warn: "#B8860B", fail: "#B3261E" };

function buildReport(rep, client) {
  const L = [];
  L.push("รายงานตรวจระบบ — ไทยโครงสร้าง");
  L.push("สร้างเมื่อ: " + new Date(rep.generatedAt).toLocaleString("th-TH"));
  L.push(`เวอร์ชันแอป: ${rep.app.version || "-"} | ฐานข้อมูล: ${rep.app.dbMode} | Node ${rep.app.node} | ${rep.app.platform} | ทำงานมาแล้ว ${rep.app.uptimeMin} นาที`);
  L.push(`ตำแหน่งผู้ใช้: ${rep.user.role} | หน้าที่เปิดอยู่: ${client.tab} | เบราว์เซอร์: ${client.ua}`);
  L.push("");
  L.push("ผลการตรวจ");
  for (const c of rep.checks) {
    L.push(`[${c.status.toUpperCase()}] ${c.label}: ${c.detail}${c.advice ? " → " + c.advice : ""}`);
  }
  L.push("");
  L.push(`ข้อผิดพลาดล่าสุด (${rep.errors.length} รายการ)`);
  if (!rep.errors.length) L.push("- ไม่มี");
  for (const e of rep.errors) {
    L.push(`- #${e.id} ${new Date(e.created_at).toLocaleString("th-TH")} [${e.view || "-"}] ${e.message}`);
    if (e.detail) L.push("    " + String(e.detail).split("\n").slice(0, 6).join("\n    "));
  }
  L.push("");
  L.push("(รายงานนี้ไม่มีรหัสผ่านหรือข้อมูลลับ ส่งให้ผู้พัฒนาเพื่อช่วยแก้ไขได้)");
  return L.join("\n");
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Assistant({ token, role, tab }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "bot", text: "สวัสดีครับ ผมเป็นผู้ช่วยของไทยโครงสร้าง ถามวิธีใช้หรือปัญหาที่เจอได้เลย หรือกดปุ่ม \"ตรวจระบบและสร้างรายงาน\" เพื่อให้ผมตรวจสุขภาพระบบให้" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const sent = useRef(new Set());

  // เก็บข้อผิดพลาดของหน้าจอส่งเข้าบันทึก เพื่อใช้ในรายงาน
  useEffect(() => {
    const report = (message, detail) => {
      const key = String(message).slice(0, 120);
      if (!message || /ResizeObserver/.test(message) || sent.current.has(key) || sent.current.size >= 5) return;
      sent.current.add(key);
      call("/api/assistant/errors", token, { method: "POST", body: { message, detail, view: tab } }).catch(() => {});
    };
    const onErr = (e) => report(e.message || "error", e.error && e.error.stack);
    const onRej = (e) => report((e.reason && e.reason.message) || String(e.reason), e.reason && e.reason.stack);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, [token, tab]);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [msgs, open]);

  const push = (m) => setMsgs((x) => [...x, m]);

  const send = (q) => {
    const text = (q ?? input).trim();
    if (!text) return;
    setInput("");
    const hit = ask(text);
    setMsgs((x) => [...x, { from: "me", text },
      hit
        ? { from: "bot", title: hit.t, text: hit.a }
        : { from: "bot", text: "ยังไม่พบคำตอบตรงกับคำถามนี้ ลองเลือกหัวข้อด้านล่าง หรือกดปุ่ม \"ตรวจระบบและสร้างรายงาน\" แล้วส่งไฟล์รายงานให้ผู้พัฒนา เพื่อให้ช่วยแก้ไขต่อ" }]);
  };

  const diagnose = async () => {
    if (busy) return;
    setBusy(true);
    push({ from: "me", text: "ตรวจระบบและสร้างรายงาน" });
    try {
      let { checks } = await call("/api/assistant/health", token);
      const notes = [];
      if (role === "ceo") {
        for (const c of checks) {
          if (c.fix === "backup_now") {
            try { const r = await call("/api/assistant/fix", token, { method: "POST", body: { id: c.fix } }); c.status = "ok"; c.detail = `สำรองข้อมูลให้แล้ว (${r.file})`; c.fix = null; notes.push("สำรองข้อมูลให้อัตโนมัติ"); }
            catch (e) { c.detail += " · สำรองอัตโนมัติไม่สำเร็จ: " + e.message; }
          }
        }
      }
      const rep = await call("/api/assistant/report", token);
      rep.checks = checks;
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      download(`ThaiStructure-report-${stamp}.txt`, buildReport(rep, { tab, ua: navigator.userAgent }));
      const bad = checks.filter((c) => c.status !== "ok").length;
      push({
        from: "bot", checks, errCount: rep.errors.length,
        text: (bad ? `พบ ${bad} จุดที่ควรดู` : "ระบบปกติ ไม่พบปัญหา") + (notes.length ? ` · ${notes.join(", ")}` : "") + " · ดาวน์โหลดไฟล์รายงานให้แล้ว ส่งไฟล์นี้ให้ผู้พัฒนาเมื่อต้องการให้ช่วยแก้บั๊กได้",
      });
    } catch (e) {
      push({ from: "bot", text: "ตรวจระบบไม่สำเร็จ: " + e.message + " — ถ้าขึ้นว่าเชื่อมต่อไม่ได้ ให้ตรวจอินเทอร์เน็ตหรือเปิดแอปใหม่" });
    }
    setBusy(false);
  };

  const clearErrors = async () => {
    try { const r = await call("/api/assistant/fix", token, { method: "POST", body: { id: "clear_errors" } }); push({ from: "bot", text: r.message }); }
    catch (e) { push({ from: "bot", text: e.message }); }
  };

  return (
    <>
      <style>{`
        .as-fab { position: fixed; right: 18px; bottom: 18px; z-index: 900; width: 52px; height: 52px; border-radius: 50%; border: 0; background: #E8641C; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.3); }
        .as-panel { position: fixed; right: 18px; bottom: 80px; z-index: 900; width: 380px; max-width: calc(100vw - 24px); height: 540px; max-height: calc(100vh - 100px); background: #fff; border: 1px solid #1B2A36; display: flex; flex-direction: column; box-shadow: 0 8px 28px rgba(0,0,0,.28); }
        .as-head { background: #1B2A36; color: #fff; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
        .as-body { flex: 1; overflow-y: auto; padding: 12px; background: #F4F3EE; }
        .as-msg { margin-bottom: 10px; max-width: 92%; font-size: 13.5px; line-height: 1.55; padding: 8px 10px; white-space: pre-wrap; }
        .as-msg.bot { background: #fff; border: 1px solid #D9D7CF; color: #1B2A36; }
        .as-msg.me { background: #1B2A36; color: #fff; margin-left: auto; }
        .as-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px 0; background: #F4F3EE; }
        .as-chip { border: 1px solid #1B2A36; background: #fff; color: #1B2A36; font-size: 12px; padding: 4px 8px; cursor: pointer; }
        .as-diag { margin: 8px 12px 0; padding: 9px; border: 0; background: #E8641C; color: #fff; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .as-diag:disabled { opacity: .6; cursor: default; }
        .as-form { display: flex; gap: 6px; padding: 10px 12px; }
        .as-form input { flex: 1; padding: 8px; border: 1px solid #B9B6AA; font: inherit; font-size: 14px; }
        .as-form button { border: 0; background: #1B2A36; color: #fff; padding: 0 12px; cursor: pointer; }
        .as-check { display: flex; gap: 6px; margin-top: 6px; font-size: 12.5px; }
        .as-check b { font-weight: 600; }
      `}</style>
      {open && (
        <div className="as-panel" role="dialog" aria-label="ผู้ช่วย">
          <div className="as-head"><span>ผู้ช่วยไทยโครงสร้าง</span><X size={18} style={{ cursor: "pointer" }} onClick={() => setOpen(false)} /></div>
          <div className="as-body">
            {msgs.map((m, i) => (
              <div key={i} className={`as-msg ${m.from}`}>
                {m.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div>}
                {m.text}
                {m.checks && m.checks.map((c) => {
                  const I = ICON[c.status];
                  return (
                    <div className="as-check" key={c.id}>
                      <I size={15} color={COLOR[c.status]} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div><b>{c.label}</b> — {c.detail}{c.status !== "ok" && c.advice ? <><br /><span style={{ color: COLOR[c.status] }}>วิธีแก้: {c.advice}</span></> : null}</div>
                    </div>
                  );
                })}
                {m.checks && m.errCount > 0 && role === "ceo" && (
                  <button className="as-chip" style={{ marginTop: 8 }} onClick={clearErrors}>ล้างบันทึกข้อผิดพลาด ({m.errCount})</button>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="as-chips">{QUICK.map((q) => <button key={q} className="as-chip" onClick={() => send(q)}>{q}</button>)}</div>
          <button className="as-diag" onClick={diagnose} disabled={busy}><Activity size={16} />{busy ? "กำลังตรวจ..." : "ตรวจระบบและสร้างรายงาน"}</button>
          <form className="as-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="พิมพ์คำถาม เช่น ลืมรหัสผ่าน" />
            <button type="submit" aria-label="ส่ง"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button className="as-fab" aria-label="เปิดผู้ช่วย" onClick={() => setOpen((v) => !v)}><MessageCircle size={24} /></button>
    </>
  );
}
