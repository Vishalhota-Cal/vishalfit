// Nutrition service: pure functions over the dietLog shape. No I/O here —
// routes read/write via db.js, this module only computes and transforms.
const { MEAL_SLOTS } = require('./referenceData');

function emptyDay(date) {
  return { date, meals: Object.fromEntries(MEAL_SLOTS.map(m => [m.key, []])) };
}

// Same defensive shape-guarantee the client's migrateDietLog() already did —
// ported here so a malformed/older day can never crash totals.
function ensureDayShape(day) {
  const meals = Object.fromEntries(
    MEAL_SLOTS.map(m => [m.key, (day.meals && Array.isArray(day.meals[m.key])) ? day.meals[m.key] : []])
  );
  return { ...day, meals };
}

function dietTotals(day) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  if (!day || !day.meals) return t;
  MEAL_SLOTS.forEach(m => (day.meals[m.key] || []).forEach(f => {
    t.calories += Number(f.calories) || 0;
    t.protein += Number(f.protein) || 0;
    t.carbs += Number(f.carbs) || 0;
    t.fat += Number(f.fat) || 0;
    t.fiber += Number(f.fiber) || 0;
  }));
  return t;
}

function normalizeEntry(entry) {
  return {
    name: entry.name,
    qty: entry.qty || 1,
    serving: entry.serving || '',
    calories: Number(entry.calories) || 0,
    protein: Number(entry.protein) || 0,
    carbs: Number(entry.carbs) || 0,
    fat: Number(entry.fat) || 0,
    fiber: entry.fiber == null ? null : Number(entry.fiber) || 0,
    loggedBy: entry.loggedBy || 'manual' // 'manual' | 'ai'
  };
}

/** Returns a NEW dietLog array with `entries` appended to date/slot. */
function addEntriesToDietLog(dietLog, date, slot, entries) {
  const next = dietLog.map(ensureDayShape);
  let day = next.find(d => d.date === date);
  if (!day) { day = emptyDay(date); next.push(day); }
  day.meals[slot] = [...day.meals[slot], ...entries.map(normalizeEntry)];
  return next;
}

/** Returns a NEW dietLog array with the entry at date/slot/idx removed. */
function removeEntryFromDietLog(dietLog, date, slot, idx) {
  return dietLog.map(ensureDayShape).map(day => {
    if (day.date !== date) return day;
    const list = [...day.meals[slot]];
    list.splice(idx, 1);
    return { ...day, meals: { ...day.meals, [slot]: list } };
  });
}

module.exports = { emptyDay, ensureDayShape, dietTotals, normalizeEntry, addEntriesToDietLog, removeEntryFromDietLog };
