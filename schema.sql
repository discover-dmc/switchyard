create extension if not exists vector;
-- gen_random_uuid() is built into Postgres core since v13, no pgcrypto extension needed.

-- Structured metadata / source records
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,        -- 'doc' | 'code' | 'qa' | 'template'
  title text,
  url text,
  ingested_at timestamptz not null default now()
);

-- Chunked content + embeddings (the "vector DB" role)
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  content text not null,
  embedding vector(1536),           -- dimension matches text-embedding-3-small; update both together if the provider changes
  chunk_index int not null,
  created_at timestamptz not null default now()
);
create index if not exists chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);

-- Entities (the "knowledge graph" nodes)
create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  entity_type text not null,        -- 'tool' | 'pattern' | 'error' | 'concept'
  description text
);

-- Relationships (the "knowledge graph" edges) — traversal via recursive CTEs, no separate graph DB
create table if not exists entity_edges (
  from_entity_id uuid references entities(id) on delete cascade,
  to_entity_id uuid references entities(id) on delete cascade,
  relation text not null,           -- 'causes' | 'requires' | 'alternative_to' | 'part_of' | 'co_occurs_with'
  primary key (from_entity_id, to_entity_id, relation)
);

-- Bridges vector search and graph traversal: which chunks mention which entities
create table if not exists chunk_entities (
  chunk_id uuid references chunks(id) on delete cascade,
  entity_id uuid references entities(id) on delete cascade,
  primary key (chunk_id, entity_id)
);
