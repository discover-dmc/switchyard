> ⚠️ **Placeholder name.** This copy uses "Switchyard," the placeholder name — see `DESIGN.md`'s banner. Swap every instance once the real name lands; nothing else about this copy changes.

This is the marketplace listing copy for the Railway template composer's "Info" field, structured per Railway's [template best-practices guide](https://docs.railway.com/guides/templates-best-practices). Not user-facing docs — those are `README.md` (quickstart) and `DESIGN.md` (architecture).

---

# Deploy and Host Switchyard with Railway

Switchyard is a hybrid retrieval-augmented generation (RAG) stack that combines vector similarity search and lightweight knowledge-graph traversal in a single Postgres database. Instead of standing up separate vector and graph databases, it uses `pgvector` plus a normalized entity-relationship table, queried together so retrieval surfaces both textually-similar and conceptually-related content in one pass.

## About Hosting Switchyard

Hosting Switchyard means running two services: an app service (ingestion and query API, Node.js/Express) and a Postgres database built from the `pgvector/pgvector` image rather than Railway's stock Postgres template, since the stock image doesn't ship the `vector` extension. The app bootstraps its schema on first boot, connects to Postgres over Railway's private network, and exposes `/ingest` and `/query` endpoints plus a minimal search UI. The only external dependency at runtime is an OpenAI API key for generating embeddings — everything else runs inside the Railway project.

## Common Use Cases

- Internal knowledge bases where answers depend on both what a document says and how concepts in it relate to concepts in other documents
- Documentation Q&A for a product or codebase, where a query about one component should also surface related components it interacts with
- Support/FAQ retrieval where root-cause relationships (`causes`, `requires`) matter as much as topical similarity
- A starting point for teams evaluating hybrid vector+graph retrieval without committing to a dedicated graph database first

## Dependencies for Switchyard Hosting

- **PostgreSQL** with the **pgvector** extension — vector storage, similarity search, and (via a normalized edges table) graph traversal, all in one database
- **Node.js / Express** — the ingestion and query API
- **OpenAI Embeddings API** (`text-embedding-3-small`) — the only external network dependency, called via native `fetch`, no SDK

### Deployment Dependencies

- [pgvector](https://github.com/pgvector/pgvector) — the Postgres extension this template depends on
- [OpenAI API keys](https://platform.openai.com/api-keys) — required for the embedding calls
- [Railway private networking](https://docs.railway.com/guides/private-networking) — how the app reaches Postgres without a public database URL

### Implementation Details (Optional)

Hybrid retrieval in one query round-trip: vector search finds the closest chunks by embedding similarity, then a recursive CTE expands outward through `entity_edges` from whatever entities those chunks mention, pulling in graph-adjacent content that wouldn't have ranked by text similarity alone.

```json
POST /query
{ "query": "How does the Redis TCP Proxy work for external access?", "limit": 1 }
```

```json
"vectorMatches": [{ "content": "The Redis TCP Proxy is a public-facing load balancer...", "similarity": 0.665 }],
"graphExpanded": [
  { "content": "Postgres connections inside a Railway project should use Private Networking..." },
  { "content": "Railway bills usage hourly based on CPU, memory, and network..." }
]
```

Both graph-expanded results share a `Private Networking` entity with the top vector match — neither ranked by text similarity, but both are relevant. Full write-up and verification notes: `DESIGN.md`.

### Why Deploy Switchyard on Railway?

Railway hosts the full stack — app and database — without separate provisioning for a vector store or graph database. Private networking connects the two services with no public database exposure by default, and Railway's variable references and generated secrets keep credentials out of the codebase. One project, one deploy, no additional infrastructure to stand up before Switchyard is queryable.
