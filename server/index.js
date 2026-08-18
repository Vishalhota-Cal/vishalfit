// Local-only entrypoint: app.listen(PORT) around the SAME app Vercel wraps
// (server/app.js) — so local dev and production run identical code instead
// of two hand-maintained copies drifting apart.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 7417;
app.listen(PORT, () => {
  console.log(`VISHALXFIT server running at http://localhost:${PORT}`);
});
