const express = require('express');
const db = require('../db/db');
const migrate = require('../db/migrate');

const router = express.Router();
const APP_ID = 'vishalxfit';
// Accepted ONLY as a bridge from older builds' export formats. Everything
// documented/written going forward is APP_ID.
const LEGACY_APP_IDS = ['vishalprime', 'vishal7'];

router.get('/export', (req, res) => {
  const kv = db.getAllKv();
  const photos = db.listPhotoMeta().map(meta => {
    const rec = db.getPhotoRecord(meta.id);
    return { ...meta, type: rec.type, image: `data:${rec.type};base64,${rec.display.toString('base64')}` };
  });
  res.json({
    app: APP_ID, schemaVersion: 1, exportedAt: new Date().toISOString(),
    settings: kv.settings, workouts: kv.workouts, exerciseLibrary: kv.exerciseLibrary,
    dietLog: kv.dietLog, foodLibrary: kv.foodLibrary, measurements: kv.measurements,
    programs: kv.programs, steps: kv.steps, cardioLog: kv.cardioLog,
    profile: kv.profile, dietPlan: kv.dietPlan, waterLog: kv.waterLog, photos
  });
});

router.post('/restore', async (req, res) => {
  const data = req.body;
  if (data.app !== APP_ID && !LEGACY_APP_IDS.includes(data.app)) {
    return res.status(400).json({ error: 'Not a VISHALXFIT (or a recognized older) backup file' });
  }
  const photos = [];
  for (const p of (data.photos || [])) {
    if (!p.image) continue;
    const match = /^data:([^;]+);base64,(.+)$/.exec(p.image);
    if (!match) continue;
    photos.push({ id: p.id, date: p.date, pose: p.pose, note: p.note || '', w: p.w, h: p.h, type: match[1], display: Buffer.from(match[2], 'base64'), thumb: null });
  }
  db.replaceAll({
    kv: {
      settings: migrate.migrateSettings(data.settings),
      workouts: migrate.migrateWorkouts(data.workouts || []),
      exerciseLibrary: data.exerciseLibrary || [],
      dietLog: migrate.migrateDietLog(data.dietLog || []),
      foodLibrary: data.foodLibrary || [],
      measurements: migrate.withIds(data.measurements || []),
      programs: data.programs || [],
      activeSession: null,
      steps: migrate.withIds(data.steps || []),
      cardioLog: migrate.withIds(data.cardioLog || []),
      profile: data.profile || null,
      dietPlan: data.dietPlan || null,
      waterLog: migrate.withIds(data.waterLog || [])
    },
    photos
  });
  res.json({
    ok: true,
    counts: { workouts: (data.workouts || []).length, measurements: (data.measurements || []).length, photos: photos.length }
  });
});

router.post('/reset', (req, res) => {
  db.resetAll();
  res.json({ ok: true });
});

module.exports = router;
