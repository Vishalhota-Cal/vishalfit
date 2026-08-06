const express = require('express');
const db = require('../db/db');
const aiService = require('../services/aiService');
const { itemsToEntries } = require('../services/foodParserService');
const { addEntriesToDietLog, dietTotals } = require('../services/nutritionService');

const router = express.Router();

// Locked product decision: fully automatic — parse AND log in one call, no
// confirm step. The response still returns what was logged so the UI can
// show a toast; it's just not gating the save on a second tap.
router.post('/estimate', async (req, res) => {
  const { description, date, slot } = req.body;
  if (!description || !description.trim()) return res.status(400).json({ error: 'description is required' });

  const settings = db.getKv('settings') || {};
  const apiKey = process.env.OPENAI_API_KEY;
  const model = settings.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const items = await aiService.estimateMeal(description, { apiKey, model });
    const entries = itemsToEntries(items);
    const dietLog = addEntriesToDietLog(db.getKv('dietLog') || [], date, slot, entries);
    db.setKv('dietLog', dietLog);
    const day = dietLog.find(d => d.date === date);
    res.json({ entries, totals: dietTotals(day) });
  } catch (e) {
    const code = e.code || 'unknown';
    const status = code === 'unauthorized' ? 401 : code === 'rate_limited' ? 429 : code === 'no_key' ? 412 : 502;
    res.status(status).json({ error: e.message, code });
  }
});

router.get('/test-key', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(412).json({ ok: false, error: 'No OPENAI_API_KEY set in server/.env' });
  try {
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + apiKey } });
    res.json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'No connection' });
  }
});

module.exports = router;
