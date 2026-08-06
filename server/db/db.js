// Database layer. Owns the SQLite connection and the only raw SQL in the
// project — every service goes through the functions here, never through
// node:sqlite directly. Keeping that boundary is what makes the service
// layer testable without a real database file (see server/test/).
//
// Uses Node's BUILT-IN `node:sqlite` (stable as of the Node version this
// project targets) rather than a native npm module — zero native
// compilation, so `npm install` can't fail on a Node/V8 ABI mismatch the way
// better-sqlite3 did on this machine.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.VISHAL_DB_PATH || path.join(__dirname, '..', '..', 'data', 'vishalprime.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

const db = openDb(DB_PATH);

const KV_KEYS = [
  'settings', 'workouts', 'exerciseLibrary', 'dietLog', 'foodLibrary',
  'measurements', 'programs', 'activeSession', 'steps', 'cardioLog',
  'profile', 'dietPlan', 'waterLog'
];

// In-memory revision counter — bumped on every write. Lets clients (e.g. a
// second device on the same LAN/tailnet) cheaply poll `GET /api/meta/rev`
// and only pull a full refresh when something actually changed, instead of
// polling the full state on a timer. Resets to 0 on server restart, which
// is fine: a client holding a stale, higher number just does one harmless
// extra refresh the next time it sees a mismatch.
let rev = 0;
function bumpRev() { rev += 1; return rev; }
function getRev() { return rev; }

function getKv(key) {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch (e) { return null; }
}
function setKv(key, value) {
  db.prepare('INSERT INTO kv(key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run({ key, value: JSON.stringify(value) });
  bumpRev();
}
function getAllKv() {
  const out = {};
  for (const key of KV_KEYS) out[key] = getKv(key);
  return out;
}

function toBuffer(v) { return v == null ? v : Buffer.from(v); }

function listPhotoMeta() {
  return db.prepare('SELECT id, date, pose, note, w, h FROM photos').all();
}
function getPhotoRecord(id) {
  const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
  if (!row) return row;
  return { ...row, display: toBuffer(row.display), thumb: toBuffer(row.thumb) };
}
function putPhoto({ id, date, pose, note, w, h, type, display, thumb }) {
  db.prepare(`
    INSERT INTO photos(id, date, pose, note, w, h, type, display, thumb)
    VALUES (@id, @date, @pose, @note, @w, @h, @type, @display, @thumb)
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date, pose=excluded.pose, note=excluded.note,
      w=excluded.w, h=excluded.h, type=excluded.type,
      display=excluded.display, thumb=excluded.thumb
  `).run({ id, date, pose: pose || '', note: note || '', w: w || null, h: h || null, type: type || 'image/jpeg', display, thumb: thumb || null });
  bumpRev();
}
function deletePhoto(id) {
  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  bumpRev();
}

function replaceAll({ kv, photos }) {
  // Used only by backup restore — one transaction so a failure can't leave
  // a half-restored database.
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM kv').run();
    db.prepare('DELETE FROM photos').run();
    for (const [key, value] of Object.entries(kv)) setKv(key, value);
    for (const p of photos) putPhoto(p);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Full factory reset — clears every row and stops (unlike replaceAll, does
 * not repopulate). Used only by the Settings "Reset All Data" danger button. */
function resetAll() {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM kv').run();
    db.prepare('DELETE FROM photos').run();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  bumpRev();
}

module.exports = {
  db, KV_KEYS, getKv, setKv, getAllKv, getRev,
  listPhotoMeta, getPhotoRecord, putPhoto, deletePhoto, replaceAll, resetAll
};
