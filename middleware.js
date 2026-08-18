// Routing Middleware (Vercel's Edge runtime by default) — runs in front of
// EVERY request, static or API, which is the whole reason this exists:
// Express (server/app.js) never sees a CDN-served static file, so an
// Express-level auth check would leave index.html, sw.js, and the manifest
// world-readable. This is the interim gate standing in for real per-user
// auth (see README "Followers") — swapping it out later means verifying a
// Supabase JWT instead of this shared-password cookie; the matcher and the
// "let it through" logic below stay the same shape.
//
// Edge runtime has Web Crypto (crypto.subtle) but no node:crypto, so this
// verifies with crypto.subtle.verify() — the exact HMAC-SHA256 the login
// route (server/routes/auth.js) signed with Node's crypto.createHmac().
// Same algorithm, same bytes in, same bytes out, regardless of runtime.
import { next } from '@vercel/functions';

const COOKIE_NAME = 'vxf_session';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

function base64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function readCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

async function verify(token, secret) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const match = /^ok\.(\d+)$/.exec(payload);
  if (!match) return false;
  if (Date.now() - Number(match[1]) > MAX_AGE_MS) return false;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, base64urlToBytes(sig), new TextEncoder().encode(payload));
}

export default async function middleware(request) {
  const ok = await verify(readCookie(request, COOKIE_NAME), process.env.SESSION_SECRET);
  if (ok) return next();

  const url = new URL(request.url);
  if (request.method === 'GET' || request.method === 'HEAD') {
    const loginUrl = new URL('/login.html', url);
    loginUrl.searchParams.set('next', url.pathname + url.search);
    return Response.redirect(loginUrl, 302);
  }
  return new Response(JSON.stringify({ error: 'Not authenticated' }), {
    status: 401, headers: { 'content-type': 'application/json' }
  });
}

export const config = {
  // Everything EXCEPT: the login page itself, its login/logout API calls,
  // and the PWA install artifacts — those three (manifest, sw.js, icons)
  // must stay reachable unauthenticated or iOS silently refuses to let you
  // "Add to Home Screen".
  matcher: ['/((?!login\\.html|api/auth/(login|logout)|manifest\\.webmanifest|sw\\.js|icon-.*\\.png|apple-touch-icon\\.png|fonts/).*)']
};
