// Builds the Express app. No app.listen() here — that's what lets the exact
// same app serve both `node server/index.js` (local dev, laptop) and
// `api/index.js` (Vercel: one serverless function wrapping this whole app).
require('dotenv').config();
const path = require('path');
const express = require('express');
const attachUser = require('./middleware/user');

const app = express();
const ROOT = path.join(__dirname, '..'); // project root — index.html, sw.js, manifest, fonts, icons live here

// Backup export/restore still carries base64-embedded photo blobs (see
// routes/backup.js) — bumped back up from a smaller limit so a restore with
// several progress photos doesn't 413. Stays under Vercel's hard 4.5mb
// function body limit; if your export grows past that, split the restore
// or trim old photos first.
app.use(express.json({ limit: '4mb' }));

// Unauthenticated on purpose — this IS the login endpoint. Everything below
// it requires the signed cookie /middleware.js checks at the edge.
app.use('/api/auth', require('./routes/auth'));

app.use(attachUser);

app.use('/api/kv', require('./routes/kv'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/session', require('./routes/sessions'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/profile', require('./routes/profile'));

// On Vercel, static files (index.html, sw.js, manifest, fonts, icons) are
// served straight from the CDN via vercel.json — this app only ever sees
// /api/* there. Locally there's no CDN, so serve them the same way the app
// always has.
if (!process.env.VERCEL) {
  app.use(express.static(ROOT, { extensions: ['html'] }));
}

// Terminal handler — every route is wrapped in asyncRoute, so a rejected
// promise (a Supabase error, a bad upstream OpenAI call, anything) lands
// here instead of hanging the request or crashing the process.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
