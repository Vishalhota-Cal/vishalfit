// The interim access gate — a single shared password standing in for real
// accounts until Supabase Auth ships (see README "Followers" section).
//
// This route SIGNS the session cookie (Node's crypto.createHmac); the actual
// gating happens in /middleware.js, which runs on Vercel's Edge runtime in
// front of every request (including static files, which Express never even
// sees) and VERIFIES the same signature using Web Crypto's crypto.subtle.
// HMAC-SHA256 is byte-for-byte identical across both — that's what lets
// "sign in Node, verify at the edge" work at all.
const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const COOKIE_NAME = 'vxf_session';
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days — this is a home-screen PWA, not a browser tab; don't force frequent relogins

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  const mac = crypto.createHmac('sha256', secret).update(payload).digest();
  return `${payload}.${base64url(mac)}`;
}

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.APP_PASSWORD;
  if (!expected || !password) return res.status(401).json({ error: 'Wrong password' });
  // Constant-time compare — this endpoint is the one place on the whole
  // deployment an attacker gets to try candidate passwords, so timing must
  // not leak how much of it they got right.
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = sign(`ok.${Date.now()}`);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE_SECONDS * 1000
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
