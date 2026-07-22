import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, bootstrap } from './db.mjs';
import { ingestSource } from './ingest.mjs';
import { hybridQuery } from './query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.status(200).send('ok');
  } catch (err) {
    res.status(503).send(err.message);
  }
});

app.post('/ingest', async (req, res) => {
  const { sourceType, title, url, text } = req.body ?? {};
  if (!sourceType || !text) {
    return res.status(400).json({ error: 'sourceType and text are required' });
  }
  try {
    const result = await ingestSource(pool, { sourceType, title, url, text });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/query', async (req, res) => {
  const { query, limit, graphDepth, graphLimit } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }
  try {
    const result = await hybridQuery(pool, query, { limit, graphDepth, graphLimit });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 8080;

bootstrap()
  .then(() => {
    app.listen(port, () => console.log(`switchyard listening on :${port}`));
  })
  .catch((err) => {
    console.error('Failed to bootstrap schema:', err);
    process.exit(1);
  });
