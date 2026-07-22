// Seeds a freshly deployed instance with real Railway docs content, so a
// template user sees real value in minutes instead of an empty database.
// Fetches live from railwayapp/docs (the public source, same repo the
// official docs site builds from) rather than bundling copied doc text
// into this repo — stays current, no redistribution baked into the template.
//
// Usage: API_BASE=https://your-deployed-app.up.railway.app node scripts/seed-railway-docs.mjs

const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const RAW_BASE = 'https://raw.githubusercontent.com/railwayapp/docs/main/content/docs';

const PAGES = [
  'networking/private-networking/how-it-works',
  'networking/tcp-proxy',
  'templates/best-practices',
  'templates/create',
  'deployments/healthchecks',
];

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

function parseTitle(markdown) {
  const match = markdown.match(/^title:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

async function seedPage(path) {
  const res = await fetch(`${RAW_BASE}/${path}.md`);
  if (!res.ok) {
    console.error(`skip ${path}: fetch failed (${res.status})`);
    return;
  }
  const raw = await res.text();
  const title = parseTitle(raw) || path;
  const text = stripFrontmatter(raw);

  const ingestRes = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceType: 'doc',
      title,
      url: `https://docs.railway.com/${path}`,
      text,
    }),
  });

  if (!ingestRes.ok) {
    console.error(`ingest failed for ${path}: ${ingestRes.status} ${await ingestRes.text()}`);
    return;
  }
  const result = await ingestRes.json();
  console.log(`seeded ${path} — ${result.chunkCount} chunk(s)`);
}

for (const page of PAGES) {
  await seedPage(page);
}

console.log('Seeding complete.');
