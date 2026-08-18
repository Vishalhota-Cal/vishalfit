const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
  res.json({ photos: await db.listPhotoMeta(req.userId) });
}));

// Resizing (max 1440px display / 320px thumb) happens client-side via canvas,
// same as before — the server just uploads the two blobs it's handed to
// Supabase Storage.
router.post('/', upload.fields([{ name: 'display', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]), asyncRoute(async (req, res) => {
  const { date, pose, note, w, h, type } = req.body;
  const display = req.files?.display?.[0];
  if (!display) return res.status(400).json({ error: 'display image is required' });
  const id = crypto.randomUUID();
  await db.putPhoto(req.userId, {
    id, date, pose, note, w: Number(w) || null, h: Number(h) || null,
    type: type || display.mimetype, display: display.buffer,
    thumb: req.files?.thumb?.[0]?.buffer || display.buffer
  });
  res.json({ id, date, pose, note, w: Number(w) || null, h: Number(h) || null });
}));

router.get('/:id/:variant', asyncRoute(async (req, res) => {
  const rec = await db.getPhotoRecord(req.userId, req.params.id);
  if (!rec) return res.status(404).end();
  const blob = req.params.variant === 'thumb' ? (rec.thumb || rec.display) : rec.display;
  res.set('Content-Type', rec.type || 'image/jpeg');
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(blob);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  await db.deletePhoto(req.userId, req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
