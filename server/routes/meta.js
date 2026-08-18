const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');
const { EXERCISE_LIBRARY_DEFAULT, FOOD_LIBRARY_DEFAULT, PHASE_PRESETS, MEAL_SLOTS } = require('../services/referenceData');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ exerciseLibraryDefault: EXERCISE_LIBRARY_DEFAULT, foodLibraryDefault: FOOD_LIBRARY_DEFAULT, phasePresets: PHASE_PRESETS, mealSlots: MEAL_SLOTS });
});

// Polled by the frontend (every 15s while visible) to detect changes made
// from another device — a trigger in Postgres bumps this on every write
// (see server/db/schema.sql), so it stays correct across serverless
// instances instead of being an in-memory counter that resets per cold start.
router.get('/rev', asyncRoute(async (req, res) => {
  res.json({ rev: await db.getRev(req.userId) });
}));

module.exports = router;
