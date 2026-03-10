const path = require('path');
const express = require('express');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');

// Default to 3000 unless:
// - PORT is explicitly provided, or
// - we are running as root (so binding to port 80 is possible).
const PORT = process.env.PORT
  ? Number(process.env.PORT)
  : (process.getuid && process.getuid() === 0 ? 80 : 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'links.json');

const app = express();

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new JSONFile(DB_PATH);
// lowdb v6 requires default data passed into the constructor.
const db = new Low(adapter, { links: [] });

async function initDb() {
  await db.read();
  // Ensure data structure stays valid when the JSON file is empty.
  db.data = db.data || { links: [] };
  await db.write();
}

initDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: list links
app.get('/api/links', async (req, res) => {
  await db.read();
  res.json(db.data.links);
});

// API: create or update link
app.post('/api/links', async (req, res) => {
  const { alias, url, description } = req.body;
  if (!alias || !url) {
    return res.status(400).json({ error: 'alias and url are required' });
  }
  const cleanAlias = alias.trim().toLowerCase();
  await db.read();
  const existing = db.data.links.find((l) => l.alias === cleanAlias);
  if (existing) {
    existing.url = url;
    existing.description = description || '';
  } else {
    db.data.links.push({
      id: nanoid(),
      alias: cleanAlias,
      url,
      description: description || '',
      createdAt: new Date().toISOString(),
    });
  }
  await db.write();
  res.json({ ok: true });
});

// API: delete link
app.delete('/api/links/:alias', async (req, res) => {
  const alias = req.params.alias.trim().toLowerCase();
  await db.read();
  const before = db.data.links.length;
  db.data.links = db.data.links.filter((l) => l.alias !== alias);
  await db.write();
  res.json({ deleted: before - db.data.links.length });
});

// Redirect handler for go/:alias
app.get('/:alias', async (req, res) => {
  const alias = req.params.alias.trim().toLowerCase();
  await db.read();
  const link = db.data.links.find((l) => l.alias === alias);
  if (!link) {
    return res.status(404).send('Link not found. Visit the dashboard to add it.');
  }
  return res.redirect(link.url);
});

app.listen(PORT, () => {
  console.log(`Go Links server running on http://localhost:${PORT}`);
  console.log('If you want to use hostnames like go/alias, map `go` to 127.0.0.1 in /etc/hosts and open http://go:' + PORT);
});
