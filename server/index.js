require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 7417;
const ROOT = path.join(__dirname, '..'); // project root — index.html, sw.js, manifest, fonts, icons live here

app.use(express.json({ limit: '60mb' })); // backup restore can carry embedded photo blobs

app.use('/api/kv', require('./routes/kv'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/session', require('./routes/sessions'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/profile', require('./routes/profile'));

app.use(express.static(ROOT, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`VISHALXFIT server running at http://localhost:${PORT}`);
});
