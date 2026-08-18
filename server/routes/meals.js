// Manual (non-AI) food logging — separate from routes/ai.js so the two
// entry paths (typed-and-matched vs AI-parsed) stay independently readable,
// even though both end up calling the same nutritionService functions.
const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');
const { addEntriesToDietLog, removeEntryFromDietLog, dietTotals } = require('../services/nutritionService');
const { FOOD_LIBRARY_DEFAULT } = require('../services/referenceData');

const router = express.Router();

router.post('/', asyncRoute(async (req, res) => {
  const { date, slot, entry } = req.body;
  const dietLog = addEntriesToDietLog(await db.getKv(req.userId, 'dietLog') || [], date, slot, [{ ...entry, loggedBy: 'manual' }]);
  await db.setKv(req.userId, 'dietLog', dietLog);

  // Grow the custom food library with genuinely new manual entries, same
  // behavior as before — but never for AI-parsed one-offs (kept out of this
  // route entirely, so no flag needed here).
  const foodLibrary = await db.getKv(req.userId, 'foodLibrary') || [];
  const known = [...FOOD_LIBRARY_DEFAULT, ...foodLibrary].some(f => f.name.toLowerCase() === entry.name.toLowerCase());
  if (!known) {
    const qty = entry.qty || 1;
    foodLibrary.push({
      name: entry.name, serving: entry.serving || '1 serving',
      calories: (Number(entry.calories) || 0) / qty, protein: (Number(entry.protein) || 0) / qty,
      carbs: (Number(entry.carbs) || 0) / qty, fat: (Number(entry.fat) || 0) / qty,
      fiber: entry.fiber == null ? null : (Number(entry.fiber) || 0) / qty
    });
    await db.setKv(req.userId, 'foodLibrary', foodLibrary);
  }

  const day = dietLog.find(d => d.date === date);
  res.json({ totals: dietTotals(day) });
}));

router.delete('/', asyncRoute(async (req, res) => {
  const { date, slot, idx } = req.body;
  const dietLog = removeEntryFromDietLog(await db.getKv(req.userId, 'dietLog') || [], date, slot, idx);
  await db.setKv(req.userId, 'dietLog', dietLog);
  res.json({ ok: true });
}));

module.exports = router;
