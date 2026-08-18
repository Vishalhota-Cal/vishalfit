// One Vercel serverless function wrapping the whole Express app — vercel.json
// rewrites every /api/* request here; Express's own router does the rest of
// the path dispatch internally, exactly like it does locally.
//
// This file is ESM (root package.json has "type": "module") but
// server/app.js is CommonJS (server/package.json overrides "type" back to
// "commonjs" for everything under server/) — importing a CJS module from
// ESM hands you its whole `module.exports` as the default import, so this
// just works.
import app from '../server/app.js';

export default app;
