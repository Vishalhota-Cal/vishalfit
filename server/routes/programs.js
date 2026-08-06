const express = require('express');
const db = require('../db/db');
const svc = require('../services/workoutProgramService');

const router = express.Router();

router.get('/', (req, res) => res.json({ programs: db.getKv('programs') || [] }));

router.post('/', (req, res) => {
  const programs = svc.createProgram(db.getKv('programs') || [], req.body);
  db.setKv('programs', programs);
  res.json({ programs });
});

router.put('/:id', (req, res) => {
  const programs = svc.updateProgram(db.getKv('programs') || [], req.params.id, req.body);
  db.setKv('programs', programs);
  res.json({ programs });
});

router.delete('/:id', (req, res) => {
  const programs = svc.deleteProgram(db.getKv('programs') || [], req.params.id);
  db.setKv('programs', programs);
  res.json({ programs });
});

router.post('/:id/activate', (req, res) => {
  const programs = svc.setActiveProgram(db.getKv('programs') || [], req.params.id);
  db.setKv('programs', programs);
  res.json({ programs });
});

router.get('/checklist', (req, res) => {
  const todayStr = req.query.date || new Date().toISOString().slice(0, 10);
  const checklist = svc.computeWeeklyChecklist(db.getKv('programs') || [], db.getKv('workouts') || [], todayStr);
  res.json(checklist);
});

module.exports = router;
