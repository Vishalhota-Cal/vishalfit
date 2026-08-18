const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');
const { computeTargetsFromStats } = require('../services/profileService');

const router = express.Router();

// Reads the profile + the latest logged weight, computes calorie/macro
// targets, and returns them — the Fuel tab's "Calculate from my stats"
// button applies whatever this returns. Doesn't persist anything itself;
// applying the result goes through the existing settings/targets path.
router.post('/targets', asyncRoute(async (req, res) => {
  const profile = await db.getKv(req.userId, 'profile');
  if (!profile || !profile.heightCm || !profile.age || !profile.sex) {
    return res.status(412).json({ error: 'Fill in your profile (height, age, sex) first' });
  }
  const measurements = await db.getKv(req.userId, 'measurements') || [];
  const latestWeight = [...measurements].filter(m => m.weight).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (!latestWeight) {
    return res.status(412).json({ error: 'Log a bodyweight entry first' });
  }
  const settings = await db.getKv(req.userId, 'settings') || {};
  const targets = computeTargetsFromStats({
    heightCm: profile.heightCm, age: profile.age, sex: profile.sex,
    activityLevel: profile.activityLevel, weightKg: Number(latestWeight.weight),
    phase: settings.phase || 'offseason'
  });
  res.json({ targets });
}));

module.exports = router;
