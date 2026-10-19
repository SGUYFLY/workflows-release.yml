// middleware/auth.js — ตรวจสอบ JWT token และสิทธิ์ตามบทบาท (RBAC)
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'ไม่พบ token' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ทำรายการนี้' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
