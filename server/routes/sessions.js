const express = require('express');
const db = require('../db/db');
const progSvc = require('../services/workoutProgramService');
const sessSvc = require('../services/workoutSessionService');

const router = express.Router();

function todayStr() { return new Date().toISOString().slice(0, 10); }

router.get('/', (req, res) => {
  const session = db.getKv('activeSession');
  res.json({ session, elapsedSeconds: session ? sessSvc.elapsedSeconds(session) : 0 });
});

router.post('/start', (req, res) => {
  const { programId, dayId } = req.body;
  const programs = db.getKv('programs') || [];
  const program = programId ? programs.find(p => p.id === programId) : progSvc.findActiveProgram(programs);
  const day = program ? (dayId ? program.days.find(d => d.id === dayId) : progSvc.getDueDayForDate(program, todayStr())) : null;
  const session = sessSvc.startSession(program, day);
  db.setKv('activeSession', session);
  res.json({ session, elapsedSeconds: 0 });
});

router.post('/set', (req, res) => {
  const session = db.getKv('activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.addSet(session, req.body.exerciseIdx, { weight: req.body.weight, reps: req.body.reps });
  db.setKv('activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
});

router.delete('/set', (req, res) => {
  const session = db.getKv('activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.removeSet(session, req.body.exerciseIdx, req.body.setIdx);
  db.setKv('activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
});

router.post('/exercise', (req, res) => {
  const session = db.getKv('activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.goToExercise(session, req.body.idx);
  db.setKv('activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
});

router.post('/add-exercise', (req, res) => {
  const session = db.getKv('activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.addExercise(session, req.body.name);
  db.setKv('activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
});

router.post('/finish', (req, res) => {
  const session = db.getKv('activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const record = sessSvc.toWorkoutRecord(session, todayStr());
  const workouts = [...(db.getKv('workouts') || []), record];
  db.setKv('workouts', workouts);
  db.setKv('activeSession', null);
  res.json({ workout: record });
});

router.delete('/', (req, res) => {
  db.setKv('activeSession', null);
  res.json({ ok: true });
});

module.exports = router;
