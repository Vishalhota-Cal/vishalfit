// Workout execution service — the live "Start Workout" session. A session is
// persisted (as the `activeSession` kv value) the moment it starts, so it
// survives closing the laptop mid-workout; elapsed time is always computed
// from `startedAt`, never from a running counter alone, so it stays correct
// even after the process — or the laptop — was asleep.
const crypto = require('crypto');

function startSession(program, day) {
  return {
    id: crypto.randomUUID(),
    programId: program ? program.id : null,
    dayId: day ? day.id : null,
    splitName: day ? day.splitName : 'Workout',
    startedAt: new Date().toISOString(),
    exerciseIdx: 0,
    exercises: (day ? day.exercises : []).map(e => ({
      templateId: e.id, name: e.name, targetSets: e.targetSets, targetReps: e.targetReps,
      targetWeight: e.targetWeight, restSec: e.restSec, isFst7: false, sets: []
    }))
  };
}

function elapsedSeconds(session, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));
}

function addSet(session, exerciseIdx, set) {
  const exercises = session.exercises.map((e, i) => i !== exerciseIdx ? e : { ...e, sets: [...e.sets, { weight: set.weight, reps: set.reps }] });
  return { ...session, exercises };
}
function removeSet(session, exerciseIdx, setIdx) {
  const exercises = session.exercises.map((e, i) => i !== exerciseIdx ? e : { ...e, sets: e.sets.filter((_, j) => j !== setIdx) });
  return { ...session, exercises };
}
function goToExercise(session, idx) {
  return { ...session, exerciseIdx: Math.max(0, Math.min(session.exercises.length - 1, idx)) };
}
function addExercise(session, name) {
  return { ...session, exercises: [...session.exercises, { templateId: null, name, targetSets: null, targetReps: null, targetWeight: null, restSec: 60, isFst7: false, sets: [] }] };
}

/** Converts a finished session into a normal `workouts` record. */
function toWorkoutRecord(session, dateStr) {
  return {
    id: crypto.randomUUID(),
    date: dateStr,
    split: session.splitName || 'Workout',
    programId: session.programId,
    dayId: session.dayId,
    exercises: session.exercises
      .filter(e => e.sets.length > 0)
      .map(e => ({ uid: crypto.randomUUID(), name: e.name, isFst7: e.isFst7, sets: e.sets }))
  };
}

module.exports = { startSession, elapsedSeconds, addSet, removeSet, goToExercise, addExercise, toWorkoutRecord };
