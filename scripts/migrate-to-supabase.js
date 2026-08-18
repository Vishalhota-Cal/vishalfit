#!/usr/bin/env node
// One-time migration: reads the local SQLite file (the laptop-only era) and
// upserts every kv key + photo into Supabase under OWNER_USER_ID. Safe to
// re-run — every write is an upsert, so running this twice just re-syncs.
//
// Usage (from repo root, with server/.env already filled in):
//   node scripts/migrate-to-supabase.js [path/to/vishalprime.db]
//
// Reads server/.env itself (doesn't require the server to be running).
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@supabase/supabase-js');

const DB_PATH = process.argv[2] || path.join(__dirname, '..', 'data', 'vishalprime.db');
const KV_KEYS = [
  'settings', 'workouts', 'exerciseLibrary', 'dietLog', 'foodLibrary',
  'measurements', 'programs', 'activeSession', 'steps', 'cardioLog',
  'profile', 'dietPlan', 'waterLog'
];

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_USER_ID, SUPABASE_PHOTOS_BUCKET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OWNER_USER_ID) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OWNER_USER_ID — fill in server/.env first.');
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error(`No SQLite file at ${DB_PATH} — nothing to migrate.`);
    process.exit(1);
  }

  console.log(`Reading ${DB_PATH} ...`);
  const db = new DatabaseSync(DB_PATH);
  // CRITICAL: the live database is almost entirely uncheckpointed WAL — most
  // writes never made it into the main file. Force everything into the main
  // file before reading, or this silently migrates a near-empty database.
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const bucket = SUPABASE_PHOTOS_BUCKET || 'progress-photos';

  let kvCount = 0;
  for (const key of KV_KEYS) {
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
    if (!row) continue;
    let value;
    try { value = JSON.parse(row.value); } catch { console.warn(`  ${key}: unparseable JSON, skipping`); continue; }
    const { error } = await supabase.from('app_kv').upsert({ user_id: OWNER_USER_ID, key, value }, { onConflict: 'user_id,key' });
    if (error) { console.error(`  ${key}: FAILED —`, error.message); continue; }
    console.log(`  ${key}: migrated`);
    kvCount++;
  }

  const photoRows = db.prepare('SELECT * FROM photos').all();
  let photoCount = 0;
  for (const p of photoRows) {
    const display = Buffer.from(p.display);
    const thumb = p.thumb ? Buffer.from(p.thumb) : null;
    const displayPath = `${OWNER_USER_ID}/${p.id}/display.jpg`;
    const { error: e1 } = await supabase.storage.from(bucket).upload(displayPath, display, { contentType: p.type || 'image/jpeg', upsert: true });
    if (e1) { console.error(`  photo ${p.id}: display upload FAILED —`, e1.message); continue; }
    let thumbPath = null;
    if (thumb) {
      thumbPath = `${OWNER_USER_ID}/${p.id}/thumb.jpg`;
      const { error: e2 } = await supabase.storage.from(bucket).upload(thumbPath, thumb, { contentType: p.type || 'image/jpeg', upsert: true });
      if (e2) { console.error(`  photo ${p.id}: thumb upload failed (continuing with display only) —`, e2.message); thumbPath = null; }
    }
    const { error: e3 } = await supabase.from('app_photos').upsert({
      id: p.id, user_id: OWNER_USER_ID, date: p.date, pose: p.pose, note: p.note || '',
      w: p.w, h: p.h, type: p.type || 'image/jpeg', display_path: displayPath, thumb_path: thumbPath
    });
    if (e3) { console.error(`  photo ${p.id}: row insert FAILED —`, e3.message); continue; }
    photoCount++;
  }

  console.log(`\nDone. ${kvCount}/${KV_KEYS.length} kv keys, ${photoCount}/${photoRows.length} photos migrated.`);

  if (process.argv.includes('--verify')) {
    console.log('\nVerifying — byte-for-byte JSON comparison against the SQLite originals:');
    let mismatches = 0;
    for (const key of KV_KEYS) {
      const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
      if (!row) continue;
      const original = JSON.parse(row.value);
      const { data, error } = await supabase.from('app_kv').select('value').eq('user_id', OWNER_USER_ID).eq('key', key).maybeSingle();
      const match = !error && JSON.stringify(data?.value) === JSON.stringify(original);
      console.log(`  ${key}: ${match ? 'match' : 'MISMATCH'}`);
      if (!match) mismatches++;
    }
    console.log(mismatches ? `\n${mismatches} mismatch(es) — investigate before trusting the migration.` : '\nAll keys match.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
