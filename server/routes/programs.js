const express = require('express');
const db = require('../db/db');
const asyncRoute = require('../lib/asyncRoute');
const svc = require('../services/workoutProgramService');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => res.json({ programs: await db.getKv(req.userId, 'programs') || [] })));

router.post('/', asyncRoute(async (req, res) => {
  const programs = svc.createProgram(await db.getKv(req.userId, 'programs') || [], req.body);
  await db.setKv(req.userId, 'programs', programs);
  res.json({ programs });
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const programs = svc.updateProgram(await db.getKv(req.userId, 'programs') || [], req.params.id, req.body);
  await db.setKv(req.userId, 'programs', programs);
  res.json({ programs });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const programs = svc.deleteProgram(await db.getKv(req.userId, 'programs') || [], req.params.id);
  await db.setKv(req.userId, 'programs', programs);
  res.json({ programs });
}));

router.post('/:id/activate', asyncRoute(async (req, res) => {
  const programs = svc.setActiveProgram(await db.getKv(req.userId, 'programs') || [], req.params.id);
  await db.setKv(req.userId, 'programs', programs);
  res.json({ programs });
}));

router.get('/checklist', asyncRoute(async (req, res) => {
  const todayStr = req.query.date || new Date().toISOString().slice(0, 10);
  const [programs, workouts] = await Promise.all([
    db.getKv(req.userId, 'programs'),
    db.getKv(req.userId, 'workouts')
  ]);
  const checklist = svc.computeWeeklyChecklist(programs || [], workouts || [], todayStr);
  res.json(checklist);
}));

module.exports = router;
