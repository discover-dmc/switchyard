// ponytail: smallest check that fails if chunking/extraction logic breaks.
// No framework — node:assert is stdlib. Only covers the pure-logic parts
// (no DB, no network) — ingest/query need a live pgvector Postgres to test.
import assert from 'node:assert/strict';
import { chunkText } from '../src/chunk.mjs';
import { extractEntities } from '../src/entities.mjs';

// chunkText: paragraphs under the size limit stay in one chunk.
{
  const text = 'First paragraph.\n\nSecond paragraph.';
  const chunks = chunkText(text, { size: 1000, overlap: 50 });
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].includes('First paragraph.'));
  assert.ok(chunks[0].includes('Second paragraph.'));
}

// chunkText: forces a split when content exceeds size, and keeps overlap.
{
  const para = 'x'.repeat(50);
  const text = [para, para, para].join('\n\n'); // ~156 chars with separators
  const chunks = chunkText(text, { size: 100, overlap: 20 });
  assert.ok(chunks.length > 1, 'expected multiple chunks');
  for (const c of chunks) assert.ok(c.length <= 120, `chunk too long: ${c.length}`);
}

// extractEntities: multi-word capitalized phrase and inline code span.
{
  const text = 'The Redis TCP Proxy times out; use `nc -zv host port` to test.';
  const entities = extractEntities(text);
  const names = entities.map((e) => e.name);
  assert.ok(names.includes('Redis TCP Proxy'), `missing capitalized phrase, got: ${names}`);
  assert.ok(names.includes('nc -zv host port'), `missing code span, got: ${names}`);
  const proxy = entities.find((e) => e.name === 'Redis TCP Proxy');
  assert.equal(proxy.entity_type, 'concept');
  const code = entities.find((e) => e.name === 'nc -zv host port');
  assert.equal(code.entity_type, 'tool');
}

// extractEntities: no duplicates for repeated mentions.
{
  const text = 'Postgres Vector Search is fast. Postgres Vector Search scales too.';
  const entities = extractEntities(text);
  const count = entities.filter((e) => e.name === 'Postgres Vector Search').length;
  assert.equal(count, 1);
}

console.log('self-check passed');
