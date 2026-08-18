const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');
const progSvc = require('../services/workoutProgramService');
const sessSvc = require('../services/workoutSessionService');

const router = express.Router();

function todayStr() { return new Date().toISOString().slice(0, 10); }

router.get('/', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  res.json({ session, elapsedSeconds: session ? sessSvc.elapsedSeconds(session) : 0 });
}));

router.post('/start', asyncRoute(async (req, res) => {
  const { programId, dayId } = req.body;
  const programs = await db.getKv(req.userId, 'programs') || [];
  const program = programId ? programs.find(p => p.id === programId) : progSvc.findActiveProgram(programs);
  const day = program ? (dayId ? program.days.find(d => d.id === dayId) : progSvc.getDueDayForDate(program, todayStr())) : null;
  const session = sessSvc.startSession(program, day);
  await db.setKv(req.userId, 'activeSession', session);
  res.json({ session, elapsedSeconds: 0 });
}));

router.post('/set', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.addSet(session, req.body.exerciseIdx, { weight: req.body.weight, reps: req.body.reps });
  await db.setKv(req.userId, 'activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
}));

router.delete('/set', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.removeSet(session, req.body.exerciseIdx, req.body.setIdx);
  await db.setKv(req.userId, 'activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
}));

router.post('/exercise', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.goToExercise(session, req.body.idx);
  await db.setKv(req.userId, 'activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
}));

router.post('/add-exercise', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const next = sessSvc.addExercise(session, req.body.name);
  await db.setKv(req.userId, 'activeSession', next);
  res.json({ session: next, elapsedSeconds: sessSvc.elapsedSeconds(next) });
}));

router.post('/finish', asyncRoute(async (req, res) => {
  const session = await db.getKv(req.userId, 'activeSession');
  if (!session) return res.status(404).json({ error: 'no active session' });
  const record = sessSvc.toWorkoutRecord(session, todayStr());
  const workouts = [...(await db.getKv(req.userId, 'workouts') || []), record];
  await db.setKv(req.userId, 'workouts', workouts);
  await db.setKv(req.userId, 'activeSession', null);
  res.json({ workout: record });
}));

router.delete('/', asyncRoute(async (req, res) => {
  await db.setKv(req.userId, 'activeSession', null);
  res.json({ ok: true });
}));

module.exports = router;
