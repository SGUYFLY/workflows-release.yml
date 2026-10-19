// middleware/security.js — จำกัดจำนวนครั้งที่เรียก (กันเดารหัสผ่าน) และตรวจอีเมล
function limiter(max = 10, windowMs = 60_000) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'ลองหลายครั้งเกินไป กรุณารอสักครู่' });
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) hits.clear();
    next();
  };
}
const validEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
module.exports = { limiter, validEmail };
