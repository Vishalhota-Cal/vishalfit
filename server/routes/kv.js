const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');

const router = express.Router();

router.get('/:key', asyncRoute(async (req, res) => {
  if (!db.KV_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'unknown key' });
  res.json({ value: await db.getKv(req.userId, req.params.key) });
}));

router.put('/:key', asyncRoute(async (req, res) => {
  if (!db.KV_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'unknown key' });
  await db.setKv(req.userId, req.params.key, req.body.value);
  res.json({ ok: true, rev: await db.getRev(req.userId) });
}));

module.exports = router;
