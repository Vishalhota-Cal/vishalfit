-- VISHAL PRIME — SQLite schema.
--
-- Deliberately NOT fully normalized: `kv` holds one JSON blob per logical
-- collection (settings, workouts, dietLog, measurements, exerciseLibrary,
-- foodLibrary, programs, activeSession) — the same shape each one had as a
-- JSON array/object in the browser's IndexedDB. For a single-user app with
-- modest daily volume, normalizing these into relational tables would only
-- add migration surface and endpoints with no real benefit. "Proper
-- separation" here comes from the service layer, not the table layout.
--
-- `photos` is the one exception — binary image data needs real columns.

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id      TEXT PRIMARY KEY,
  date    TEXT NOT NULL,
  pose    TEXT NOT NULL,
  note    TEXT DEFAULT '',
  w       INTEGER,
  h       INTEGER,
  type    TEXT DEFAULT 'image/jpeg',
  display BLOB NOT NULL,
  thumb   BLOB
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
