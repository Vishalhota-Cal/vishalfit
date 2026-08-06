// Unit tests for the pure service-layer functions. Uses Node's built-in test
// runner (`node --test`) — zero new dependencies, consistent with this
// project's no-build-step philosophy.
const test = require('node:test');
const assert = require('node:assert/strict');

const nutrition = require('../services/nutritionService');
const parser = require('../services/foodParserService');
const programSvc = require('../services/workoutProgramService');
const sessionSvc = require('../services/workoutSessionService');
const profileSvc = require('../services/profileService');

test('nutritionService.dietTotals sums calories/protein/carbs/fat/fiber across all meal slots', () => {
  const day = {
    date: '2026-08-05',
    meals: {
      breakfast: [{ calories: 300, protein: 20, carbs: 30, fat: 5, fiber: 4 }],
      lunch: [{ calories: 500, protein: 30, carbs: 50, fat: 10, fiber: 6 }],
      dinner: [], preworkout: [], postworkout: [], snacks: []
    }
  };
  const t = nutrition.dietTotals(day);
  assert.equal(t.calories, 800);
  assert.equal(t.protein, 50);
  assert.equal(t.fiber, 10);
});

test('nutritionService.dietTotals never throws on a malformed/missing day', () => {
  assert.deepEqual(nutrition.dietTotals(null), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  assert.deepEqual(nutrition.dietTotals({ date: '2026-08-05' }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  // meals missing a slot entirely — must not throw (this was the actual
  // client-side bug fixed last session; the server must not regress it)
  assert.doesNotThrow(() => nutrition.dietTotals({ date: 'x', meals: { breakfast: [{ calories: 1 }] } }));
});

test('nutritionService.addEntriesToDietLog creates the day if missing and appends to the right slot', () => {
  const next = nutrition.addEntriesToDietLog([], '2026-08-05', 'lunch', [{ name: 'Roti', calories: 71, protein: 2.7, carbs: 15, fat: 0.5, fiber: 1.9 }]);
  assert.equal(next.length, 1);
  assert.equal(next[0].meals.lunch.length, 1);
  assert.equal(next[0].meals.lunch[0].name, 'Roti');
  assert.equal(next[0].meals.breakfast.length, 0);
});

test('nutritionService.removeEntryFromDietLog removes only the targeted entry', () => {
  let log = nutrition.addEntriesToDietLog([], '2026-08-05', 'lunch', [{ name: 'A', calories: 1 }, { name: 'B', calories: 2 }]);
  log = nutrition.removeEntryFromDietLog(log, '2026-08-05', 'lunch', 0);
  assert.equal(log[0].meals.lunch.length, 1);
  assert.equal(log[0].meals.lunch[0].name, 'B');
});

test('foodParserService.itemsToEntries splits a compound AI response into itemized entries, tagged loggedBy:ai', () => {
  const items = [
    { label: 'Roti', serving: '4 pieces', calories: 284, protein: 10.8, carbs: 60, fat: 2, fiber: 7.6, confidence: 'high' },
    { label: 'Dal Tadka', serving: '250g', calories: 300, protein: 15, carbs: 40, fat: 8, fiber: 10, confidence: 'medium' }
  ];
  const entries = parser.itemsToEntries(items);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'Roti');
  assert.equal(entries[1].loggedBy, 'ai');
  assert.equal(entries[0].calories, 284);
});

test('workoutProgramService.computeWeeklyChecklist ignores days a program has no plan for', () => {
  let programs = programSvc.createProgram([], {
    name: 'PPL',
    days: [{ weekday: 1, splitName: 'Push', exercises: [] }] // Monday only
  });
  programs = programSvc.setActiveProgram(programs, programs[0].id);
  // 2026-08-05 is a Wednesday; the 7-day window ending there includes exactly one Monday.
  const checklist = programSvc.computeWeeklyChecklist(programs, [], '2026-08-05');
  const dueDays = checklist.days.filter(d => d.due);
  assert.equal(dueDays.length, 1);
  assert.equal(checklist.completionPct, 0); // due but nothing logged
});

test('workoutProgramService.computeWeeklyChecklist counts a logged workout on a due date as completed', () => {
  let programs = programSvc.createProgram([], { name: 'PPL', days: [{ weekday: 3, splitName: 'Legs', exercises: [] }] });
  programs = programSvc.setActiveProgram(programs, programs[0].id);
  const workouts = [{ id: 'w1', date: '2026-08-05', split: 'Legs', exercises: [] }]; // Wed = weekday 3
  const checklist = programSvc.computeWeeklyChecklist(programs, workouts, '2026-08-05');
  assert.equal(checklist.completionPct, 100);
});

test('workoutProgramService.computeWeeklyChecklist returns null percentage with no active program', () => {
  const checklist = programSvc.computeWeeklyChecklist([], [], '2026-08-05');
  assert.equal(checklist.completionPct, null);
});

test('workoutSessionService.elapsedSeconds is derived from startedAt, not a counter', () => {
  const session = sessionSvc.startSession(null, null);
  const fakeNow = new Date(session.startedAt).getTime() + 90_000; // 90s later
  assert.equal(sessionSvc.elapsedSeconds(session, fakeNow), 90);
});

test('workoutSessionService.addSet / toWorkoutRecord only carries exercises with at least one logged set', () => {
  const program = { id: 'p1', days: [] };
  const day = { id: 'd1', splitName: 'Push', exercises: [{ id: 'e1', name: 'Bench Press', targetSets: 4, targetReps: '8', targetWeight: 100, restSec: 90 }] };
  let session = sessionSvc.startSession(program, day);
  session = sessionSvc.addExercise(session, 'Extra Exercise Never Logged');
  session = sessionSvc.addSet(session, 0, { weight: 100, reps: 8 });
  const record = sessionSvc.toWorkoutRecord(session, '2026-08-05');
  assert.equal(record.exercises.length, 1);
  assert.equal(record.exercises[0].name, 'Bench Press');
  assert.equal(record.split, 'Push');
});

test('workoutSessionService.goToExercise clamps to a valid index', () => {
  const day = { id: 'd1', splitName: 'Push', exercises: [{ id: 'e1', name: 'A' }, { id: 'e2', name: 'B' }] };
  let session = sessionSvc.startSession(null, day);
  session = sessionSvc.goToExercise(session, 99);
  assert.equal(session.exerciseIdx, 1);
  session = sessionSvc.goToExercise(session, -5);
  assert.equal(session.exerciseIdx, 0);
});

test('profileService.computeBMI categorizes across all boundaries correctly', () => {
  assert.equal(profileSvc.computeBMI(180, 55).category, 'Underweight');  // BMI ~17.0
  assert.equal(profileSvc.computeBMI(180, 75).category, 'Normal');       // BMI ~23.1
  assert.equal(profileSvc.computeBMI(180, 90).category, 'Overweight');   // BMI ~27.8
  assert.equal(profileSvc.computeBMI(180, 105).category, 'Obese');       // BMI ~32.4
});

test('profileService.computeBMI returns null instead of NaN/Infinity when inputs are missing', () => {
  assert.equal(profileSvc.computeBMI(null, 75), null);
  assert.equal(profileSvc.computeBMI(180, null), null);
  assert.equal(profileSvc.computeBMI(0, 75), null);
});

test('profileService.computeBMR uses the correct sign for the male vs female Mifflin-St Jeor branch', () => {
  const stats = { heightCm: 180, weightKg: 80, age: 30 };
  const male = profileSvc.computeBMR({ ...stats, sex: 'male' });
  const female = profileSvc.computeBMR({ ...stats, sex: 'female' });
  // Same height/weight/age — male branch adds 5, female subtracts 161, so
  // the male result must be exactly 166 higher. A sign error on either
  // term would silently break this by a different, wrong amount.
  assert.equal(male - female, 166);
});

test('profileService.computeTargetsFromStats: off-season > prep > peak calories for identical stats', () => {
  const base = { heightCm: 178, weightKg: 85, age: 28, sex: 'male', activityLevel: 'moderate' };
  const off = profileSvc.computeTargetsFromStats({ ...base, phase: 'offseason' });
  const prep = profileSvc.computeTargetsFromStats({ ...base, phase: 'prep' });
  const peak = profileSvc.computeTargetsFromStats({ ...base, phase: 'peak' });
  assert.ok(off.calories > prep.calories, 'off-season should exceed prep');
  assert.ok(prep.calories > peak.calories, 'prep should exceed peak');
  // Protein target is bodyweight-driven, not phase-driven — it should be
  // identical across all three for the same weight.
  assert.equal(off.protein, prep.protein);
  assert.equal(prep.protein, peak.protein);
});

test('profileService.computeTargetsFromStats returns null when required stats are missing', () => {
  assert.equal(profileSvc.computeTargetsFromStats({ heightCm: 180, weightKg: 80 }), null);
});
