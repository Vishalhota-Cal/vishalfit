const express = require('express');
const db = require('../db/db');

const router = express.Router();

router.get('/:key', (req, res) => {
  if (!db.KV_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'unknown key' });
  res.json({ value: db.getKv(req.params.key) });
});

router.put('/:key', (req, res) => {
  if (!db.KV_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'unknown key' });
  db.setKv(req.params.key, req.body.value);
  res.json({ ok: true, rev: db.getRev() });
});

module.exports = router;
