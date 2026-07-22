import { chunkText } from './chunk.mjs';
import { extractEntities } from './entities.mjs';
import { getEmbedding } from './embeddings.mjs';

async function upsertEntity(client, entity) {
  const { rows } = await client.query(
    `insert into entities (name, entity_type)
     values ($1, $2)
     on conflict (name) do update set name = excluded.name
     returning id`,
    [entity.name, entity.entity_type],
  );
  return rows[0].id;
}

export async function ingestSource(pool, { sourceType, title, url, text }) {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const { rows: [source] } = await client.query(
      `insert into sources (source_type, title, url) values ($1, $2, $3) returning id`,
      [sourceType, title ?? null, url ?? null],
    );

    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await getEmbedding(content);

      const { rows: [chunk] } = await client.query(
        `insert into chunks (source_id, content, embedding, chunk_index)
         values ($1, $2, $3, $4) returning id`,
        [source.id, content, JSON.stringify(embedding), i],
      );

      const entities = extractEntities(content);
      const entityIds = [];
      for (const entity of entities) {
        const entityId = await upsertEntity(client, entity);
        entityIds.push(entityId);
        await client.query(
          `insert into chunk_entities (chunk_id, entity_id) values ($1, $2)
           on conflict do nothing`,
          [chunk.id, entityId],
        );
      }

      // Co-occurrence edges, both directions so 1-hop expansion doesn't
      // need to care which side of the pair it started from.
      for (let a = 0; a < entityIds.length; a++) {
        for (let b = 0; b < entityIds.length; b++) {
          if (a === b) continue;
          await client.query(
            `insert into entity_edges (from_entity_id, to_entity_id, relation)
             values ($1, $2, 'co_occurs_with')
             on conflict do nothing`,
            [entityIds[a], entityIds[b]],
          );
        }
      }
    }

    await client.query('commit');
    return { sourceId: source.id, chunkCount: chunks.length };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
