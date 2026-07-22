# Switchyard

> ⚠️ **Placeholder name.** "Switchyard" (a classification yard — the part of a railyard where cars get sorted and routed onto the right outbound train) is a stand-in, not final. See `DESIGN.md` for the full note.

A hybrid vector + graph RAG stack for Railway — two services, not three or four. `pgvector` plus a normalized entity-edges table inside one Postgres instance covers both vector search and lightweight graph traversal, instead of running a separate vector DB and graph DB alongside Postgres.

Full architecture, data model, and the verified end-to-end proof that graph expansion actually surfaces content pure vector search misses: see [`DESIGN.md`](./DESIGN.md).

## Requirements

- A Postgres instance built from the `pgvector/pgvector` image (the stock Railway Postgres template does **not** ship the `vector` extension)
- An OpenAI API key (embeddings — `text-embedding-3-small`)

## Quickstart

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
npm start
```

The server bootstraps the schema on boot (`schema.sql`, idempotent), then listens on `PORT` (default `8080`):

- `GET /health`
- `POST /ingest` — `{ sourceType, title?, url?, text }`
- `POST /query` — `{ query, limit?, graphDepth?, graphLimit? }`
- `/` — a minimal search UI (`public/index.html`)

Seed it with real content instead of starting from an empty database:

```bash
API_BASE=https://your-deployed-instance.up.railway.app node scripts/seed-railway-docs.mjs
```

## Testing

```bash
npm run self-check
```

Covers the pure-logic parts (chunking, entity extraction) with `node:assert` — no framework, no DB required. Ingest/query against a live database have been verified manually against real Railway infrastructure but don't yet have a repeatable automated test — see the parent project's `TODO.md` test-strategy notes if you're picking that up.

## License

MIT — see [`LICENSE`](./LICENSE).
