import { getEmbedding } from './embeddings.mjs';

// Two-step hybrid retrieval: vector similarity finds the semantically closest
// chunks, then graph expansion (recursive CTE, depth-bounded) pulls in
// chunks connected via shared entities even if they're not textually
// similar — the thing pure vector search misses. See DESIGN.md for why.
export async function hybridQuery(pool, queryText, { limit = 5, graphDepth = 1, graphLimit = 5 } = {}) {
  const embedding = await getEmbedding(queryText);
  const vector = JSON.stringify(embedding);

  const { rows: vectorMatches } = await pool.query(
    `select id, content, source_id, 1 - (embedding <=> $1) as similarity
     from chunks
     order by embedding <=> $1
     limit $2`,
    [vector, limit],
  );

  if (vectorMatches.length === 0) {
    return { vectorMatches: [], graphExpanded: [] };
  }

  const topChunkIds = vectorMatches.map((c) => c.id);

  const { rows: seedEntities } = await pool.query(
    `select distinct entity_id from chunk_entities where chunk_id = any($1::uuid[])`,
    [topChunkIds],
  );

  if (seedEntities.length === 0) {
    return { vectorMatches, graphExpanded: [] };
  }

  const seedIds = seedEntities.map((e) => e.entity_id);

  const { rows: expandedEntities } = await pool.query(
    `with recursive expanded as (
       select id, 0 as depth from entities where id = any($1::uuid[])
       union
       select ee.to_entity_id, ex.depth + 1
       from entity_edges ee
       join expanded ex on ee.from_entity_id = ex.id
       where ex.depth < $2
     )
     select distinct id from expanded where depth > 0`,
    [seedIds, graphDepth],
  );

  if (expandedEntities.length === 0) {
    return { vectorMatches, graphExpanded: [] };
  }

  const expandedIds = expandedEntities.map((e) => e.id);

  const { rows: graphExpanded } = await pool.query(
    `select distinct c.id, c.content, c.source_id
     from chunk_entities ce
     join chunks c on c.id = ce.chunk_id
     where ce.entity_id = any($1::uuid[])
       and c.id != all($2::uuid[])
     limit $3`,
    [expandedIds, topChunkIds, graphLimit],
  );

  return { vectorMatches, graphExpanded };
}
