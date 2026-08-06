const express = require('express');
const db = require('../db/db');
const { EXERCISE_LIBRARY_DEFAULT, FOOD_LIBRARY_DEFAULT, PHASE_PRESETS, MEAL_SLOTS } = require('../services/referenceData');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ exerciseLibraryDefault: EXERCISE_LIBRARY_DEFAULT, foodLibraryDefault: FOOD_LIBRARY_DEFAULT, phasePresets: PHASE_PRESETS, mealSlots: MEAL_SLOTS });
});

// Polled by the frontend (every 15s while visible) to detect changes made
// from another device sharing this server — e.g. testing on an iPhone
// alongside the Mac. Cheap: just an in-memory counter, no DB read.
router.get('/rev', (req, res) => {
  res.json({ rev: db.getRev() });
});

module.exports = router;
