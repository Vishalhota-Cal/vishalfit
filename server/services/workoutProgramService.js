// Workout program service — CRUD over the `programs` kv collection, plus the
// weekly-checklist calculation. Pure functions: every mutator takes the
// current programs array and returns a NEW one; routes own persistence.
const crypto = require('crypto');

function makeExercise(e) {
  return {
    id: e.id || crypto.randomUUID(),
    name: e.name,
    muscleGroup: e.muscleGroup || '',
    targetSets: Number(e.targetSets) || 3,
    targetReps: e.targetReps || '8-12',
    targetWeight: e.targetWeight === '' || e.targetWeight == null ? null : Number(e.targetWeight),
    restSec: Number(e.restSec) || 60,
    notes: e.notes || ''
  };
}
function makeDay(d) {
  return {
    id: d.id || crypto.randomUUID(),
    weekday: Number(d.weekday), // 0=Sun..6=Sat, matches Date#getDay()
    splitName: d.splitName || 'Workout',
    exercises: (d.exercises || []).map(makeExercise)
  };
}

function createProgram(programs, { name, days }) {
  const program = { id: crypto.randomUUID(), name, active: programs.length === 0, days: (days || []).map(makeDay) };
  return [...programs, program];
}
function updateProgram(programs, id, patch) {
  return programs.map(p => p.id === id ? { ...p, ...patch, days: patch.days ? patch.days.map(makeDay) : p.days } : p);
}
function deleteProgram(programs, id) {
  return programs.filter(p => p.id !== id);
}
function setActiveProgram(programs, id) {
  return programs.map(p => ({ ...p, active: p.id === id }));
}
function findActiveProgram(programs) {
  return programs.find(p => p.active) || null;
}
// Date strings ("YYYY-MM-DD") are already unambiguous calendar dates — the
// bug to avoid is parsing one as LOCAL time (`new Date(str+'T00:00:00')`)
// and then reading it back out with UTC getters, or vice versa. That
// mismatch silently shifts every date by a day for anyone not in UTC+0.
// Do all arithmetic in UTC, consistently, both in and out.
function dateStrToUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function weekdayOf(dateStr) {
  return new Date(dateStrToUTC(dateStr)).getUTCDay();
}
function addDaysUTC(dateStr, days) {
  return new Date(dateStrToUTC(dateStr) + days * 86400000).toISOString().slice(0, 10);
}

function getDueDayForDate(program, dateStr) {
  if (!program) return null;
  const weekday = weekdayOf(dateStr);
  return program.days.find(d => d.weekday === weekday) || null;
}

/**
 * Last 7 days ending today. A day only counts toward the percentage if the
 * active program actually schedules something for it — rest days aren't
 * held against you. "Completed" is deliberately loose: any workout logged
 * on that date counts, whether or not it was started via a program session
 * — so ad-hoc logging (which is most of this app's history) still shows up
 * as progress instead of looking like a missed day.
 */
function computeWeeklyChecklist(programs, workouts, todayStr) {
  const program = findActiveProgram(programs);
  const workoutDates = new Set(workouts.map(w => w.date));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDaysUTC(todayStr, -i);
    const due = getDueDayForDate(program, dateStr);
    days.push({ date: dateStr, weekday: weekdayOf(dateStr), due: due ? { id: due.id, splitName: due.splitName } : null, completed: workoutDates.has(dateStr) });
  }
  const dueDays = days.filter(d => d.due);
  const completionPct = dueDays.length ? Math.round((dueDays.filter(d => d.completed).length / dueDays.length) * 100) : null;
  return { programName: program ? program.name : null, days, completionPct };
}

module.exports = {
  createProgram, updateProgram, deleteProgram, setActiveProgram,
  findActiveProgram, getDueDayForDate, computeWeeklyChecklist
};
