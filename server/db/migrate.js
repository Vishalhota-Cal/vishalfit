// Server-side port of the sanitizers the client used to run on every load —
// same shapes, same defensive backfills, now run once on import instead of
// on every page load (the browser no longer owns the raw data at all).
const crypto = require('crypto');
const { PHASE_PRESETS } = require('../services/referenceData');
const { ensureDayShape } = require('../services/nutritionService');

function freshTargets(phase) {
  const { label, ...t } = PHASE_PRESETS[phase] || PHASE_PRESETS.offseason;
  return t;
}
function migrateSettings(settings) {
  const base = { phase: 'offseason', unit: 'kg', targets: freshTargets('offseason'), targetsEdited: false, aiModel: 'gpt-4o-mini' };
  const s = Object.assign(base, settings || {});
  if (s.targets && 'label' in s.targets) delete s.targets.label;
  if (!s.targets) s.targets = freshTargets(s.phase in PHASE_PRESETS ? s.phase : 'offseason');
  return s;
}
function withIds(list) {
  return (list || []).map(x => x.id ? x : { ...x, id: crypto.randomUUID() });
}
function migrateWorkouts(list) {
  return withIds(list).map(w => ({ ...w, exercises: (w.exercises || []).map(ex => ex.uid ? ex : { ...ex, uid: crypto.randomUUID() }) }));
}
function migrateDietLog(list) {
  return (list || []).map(ensureDayShape);
}

module.exports = { migrateSettings, migrateWorkouts, migrateDietLog, withIds, freshTargets };
