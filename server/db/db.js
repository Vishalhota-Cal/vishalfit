// Database layer. The only file that talks to Supabase (Postgres + Storage) —
// every service/route goes through the functions here, never through the
// Supabase client directly. Keeping that boundary is what makes the service
// layer testable without a real database (see server/test/).
//
// Every function is user-scoped (first arg is always userId, from
// req.userId — see server/middleware/user.js) and async, since a Supabase
// call is a network round-trip, not a local file read. See
// server/lib/asyncRoute.js for how routes surface a rejected promise here.
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PHOTOS_BUCKET } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see server/.env.example) — create a Supabase project and copy them from Settings → API.');
}
const BUCKET = SUPABASE_PHOTOS_BUCKET || 'progress-photos';

// service_role bypasses RLS — this key never reaches the browser (server-only).
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function check(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

const KV_KEYS = [
  'settings', 'workouts', 'exerciseLibrary', 'dietLog', 'foodLibrary',
  'measurements', 'programs', 'activeSession', 'steps', 'cardioLog',
  'profile', 'dietPlan', 'waterLog'
];

async function getKv(userId, key) {
  const { data, error } = await supabase.from('app_kv').select('value').eq('user_id', userId).eq('key', key).maybeSingle();
  check(error, `getKv(${key})`);
  return data ? data.value : null;
}
async function setKv(userId, key, value) {
  const { error } = await supabase.from('app_kv')
    .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
  check(error, `setKv(${key})`);
}
async function getAllKv(userId) {
  const { data, error } = await supabase.from('app_kv').select('key,value').eq('user_id', userId);
  check(error, 'getAllKv');
  const out = {};
  for (const key of KV_KEYS) out[key] = null;
  for (const row of data || []) out[row.key] = row.value;
  return out;
}
async function getRev(userId) {
  const { data, error } = await supabase.from('app_rev').select('rev').eq('user_id', userId).maybeSingle();
  check(error, 'getRev');
  return data ? Number(data.rev) : 0;
}

function photoPaths(userId, id) {
  return { display: `${userId}/${id}/display.jpg`, thumb: `${userId}/${id}/thumb.jpg` };
}
async function downloadBuffer(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  check(error, `storage download(${path})`);
  return Buffer.from(await data.arrayBuffer());
}

async function listPhotoMeta(userId) {
  const { data, error } = await supabase.from('app_photos').select('id,date,pose,note,w,h').eq('user_id', userId).order('date', { ascending: false });
  check(error, 'listPhotoMeta');
  return data || [];
}
async function getPhotoRecord(userId, id) {
  const { data: row, error } = await supabase.from('app_photos').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  check(error, 'getPhotoRecord');
  if (!row) return null;
  const display = await downloadBuffer(row.display_path);
  const thumb = row.thumb_path ? await downloadBuffer(row.thumb_path) : null;
  return { ...row, display, thumb };
}
async function putPhoto(userId, { id, date, pose, note, w, h, type, display, thumb }) {
  const paths = photoPaths(userId, id);
  const contentType = type || 'image/jpeg';
  const { error: e1 } = await supabase.storage.from(BUCKET).upload(paths.display, display, { contentType, upsert: true });
  check(e1, 'putPhoto display upload');
  let thumbPath = null;
  if (thumb) {
    const { error: e2 } = await supabase.storage.from(BUCKET).upload(paths.thumb, thumb, { contentType, upsert: true });
    check(e2, 'putPhoto thumb upload');
    thumbPath = paths.thumb;
  }
  const { error: e3 } = await supabase.from('app_photos').upsert({
    id, user_id: userId, date, pose: pose || '', note: note || '',
    w: w || null, h: h || null, type: contentType, display_path: paths.display, thumb_path: thumbPath
  });
  check(e3, 'putPhoto row upsert');
}
async function deletePhoto(userId, id) {
  const { data: row } = await supabase.from('app_photos').select('display_path,thumb_path').eq('user_id', userId).eq('id', id).maybeSingle();
  if (row) {
    const paths = [row.display_path, row.thumb_path].filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase.from('app_photos').delete().eq('user_id', userId).eq('id', id);
  check(error, 'deletePhoto');
}

// Used by backup restore and the Settings "Reset All Data" button. Clears
// KV + photo METADATA for this user only — deliberately does not touch the
// Storage bucket, so a restore that includes photo bytes (see routes/backup.js)
// can re-link/re-upload them, and a plain reset can't orphan-delete files a
// restore might still want.
async function clearUserData(userId) {
  const { error: e1 } = await supabase.from('app_kv').delete().eq('user_id', userId);
  check(e1, 'clearUserData kv');
  const { error: e2 } = await supabase.from('app_photos').delete().eq('user_id', userId);
  check(e2, 'clearUserData photos');
}
async function replaceAll(userId, { kv, photos }) {
  await clearUserData(userId);
  const rows = Object.entries(kv).map(([key, value]) => ({ user_id: userId, key, value, updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await supabase.from('app_kv').upsert(rows, { onConflict: 'user_id,key' });
    check(error, 'replaceAll kv');
  }
  for (const p of photos) await putPhoto(userId, p);
}
async function resetAll(userId) {
  await clearUserData(userId);
}

module.exports = {
  KV_KEYS, getKv, setKv, getAllKv, getRev,
  listPhotoMeta, getPhotoRecord, putPhoto, deletePhoto, replaceAll, resetAll
};
