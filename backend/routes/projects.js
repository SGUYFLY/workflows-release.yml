// routes/projects.js — CRUD โครงการ (ส่งข้อมูลรูปแบบที่หน้าเว็บใช้ได้ทันที)
const express = require('express');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);

const SELECT = `
  SELECT p.id, p.name, p.status, p.progress,
         p.budget::float8 AS budget, p.spent::float8 AS spent,
         to_char(p.start_date,'YYYY-MM-DD') AS start,
         to_char(p.end_date,'YYYY-MM-DD')   AS "end",
         c.name AS client, u.name AS supervisor
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN users   u ON u.id = p.supervisor_id`;

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: e.message }); });

router.get('/', wrap(async (req, res) => {
  const { rows } = await pool.query(`${SELECT} ORDER BY p.id DESC`);
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'ไม่พบโครงการ' });
  res.json(rows[0]);
}));

router.post('/', requireRole(['ceo', 'supervisor']), wrap(async (req, res) => {
  const { name, client, supervisor, budget, start, end } = req.body;
  if (!name || !client) return res.status(400).json({ error: 'ต้องระบุชื่อโครงการและชื่อลูกค้า' });
  let c = await pool.query('SELECT id FROM clients WHERE name = $1 LIMIT 1', [client]);
  if (!c.rows[0]) c = await pool.query('INSERT INTO clients (name) VALUES ($1) RETURNING id', [client]);
  let supId = null;
  if (supervisor) {
    const s = await pool.query('SELECT id FROM users WHERE name = $1 LIMIT 1', [supervisor]);
    supId = s.rows[0] ? s.rows[0].id : null;
  } else if (req.user.role === 'supervisor') supId = req.user.id;
  const ins = await pool.query(
    `INSERT INTO projects (client_id, supervisor_id, name, budget, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [c.rows[0].id, supId, name, Number(budget) || 0, start || null, end || null]
  );
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [ins.rows[0].id]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', requireRole(['ceo', 'supervisor']), wrap(async (req, res) => {
  const { name, status, progress, budget, spent } = req.body;
  const up = await pool.query(
    `UPDATE projects SET name=COALESCE($1,name), status=COALESCE($2,status), progress=COALESCE($3,progress),
       budget=COALESCE($4,budget), spent=COALESCE($5,spent) WHERE id=$6 RETURNING id`,
    [name ?? null, status ?? null, progress ?? null, budget ?? null, spent ?? null, req.params.id]
  );
  if (!up.rows[0]) return res.status(404).json({ error: 'ไม่พบโครงการ' });
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [req.params.id]);
  res.json(rows[0]);
}));

module.exports = router;
