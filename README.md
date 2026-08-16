> [!CAUTION]
> **This repository is archived. Do not build against it.**
>
> MetaBuilder was split into single-purpose repos and the active, slimmed-down
> repo is now **[metabuilder](https://github.com/johndoe6345789/metabuilder)**.
> Everything below describes the old monolith — the Flask backends, the
> combined `frontends/` tree and the 27k-file layout are all history.
>
> Nothing depends on this repo any more. `.github/workflows/gated-pipeline.yml`
> was the last publisher of `ghcr.io/johndoe6345789/metabuilder-small/*`, and
> the final consumer — metabuilder's `deploy/compose.yml`, which pulled
> `postgres-dashboard` — was repointed at the postgres repo's own dual-arch
> image on 2026-08-16. Any `metabuilder-small/*` image still in a registry is a
> **frozen, unmaintained artifact**: nothing rebuilds it, and the app images
> among them are amd64-only, so they need emulation on Apple silicon.
>
> Where things went:
>
> | Looking for | Now in |
> |---|---|
> | The platform, its frontends and CI | [metabuilder](https://github.com/johndoe6345789/metabuilder) |
> | The C++ DBAL daemon | [dbal](https://github.com/johndoe6345789/dbal) |
> | The Postgres admin dashboard | [postgres](https://github.com/johndoe6345789/postgres) |
> | Everything else, repo by repo | [reposplit](https://github.com/johndoe6345789/reposplit#readme) |

---

# MetaBuilder

**Philosophy**: 95% JSON config, 5% TypeScript/C++ infrastructure
**Scale**: 27,826+ files across 34 directories
**Status**: Production-ready — Phase 2 complete

---

## What's Running

### Pastebin — Code Snippet Manager
Full-stack app: Next.js frontend + Flask auth backend + C++ DBAL API

```
http://localhost/pastebin          # UI
http://localhost/pastebin-api      # Flask auth (register, login, Python runner)
http://localhost:8080              # DBAL C++ REST API (entities)
```

**Test accounts** (seeded on first startup):

| User | Password | Namespaces | Snippets |
|------|----------|------------|---------|
| `demo` | `demo1234` | Default, Python Recipes, SQL Patterns, Utilities | 11 |
| `alice` | `alice1234` | Default, React Components, CSS Tricks, JS Utilities | 9 |
| `bob` | `bob12345` | Default, Go Patterns, Bash Scripts, API Design | 8 |

---

## Quick Start

```bash
# Deploy full stack
cd deployment
docker compose -f docker-compose.stack.yml up -d

# Build & deploy a specific app
./build-apps.sh --force dbal pastebin

# Rebuild base images (rare)
./build-base-images.sh
```

---

## Architecture

```
Browser
  └── Next.js (React + Redux + IndexedDB)
        └── Flask (auth, Python runner, JWT)
              └── DBAL C++ daemon (REST API, 14 DB backends)
                    └── PostgreSQL (prod) / SQLite (dev)
```

**DBAL event flow** (user registration → automatic seeding):
```
POST /User  →  pastebin.User.created  →  WfEngine (detached thread)
                  └── on_user_created.json workflow
                        ├── dbal.uuid × 7
                        ├── dbal.timestamp
                        ├── dbal.entity.create → Namespace "Default"
                        ├── dbal.entity.create → Namespace "Examples"
                        └── dbal.entity.create × 5 → seed snippets
```

---

## Key Directories

```
metabuilder/
├── dbal/
│   ├── production/          # C++ daemon (Drogon HTTP, 14 DB backends, JWT auth)
│   │   ├── src/workflow/    # Event-driven workflow engine (7 step types)
│   │   ├── src/auth/        # JWT validation + JSON ACL config
│   │   └── build-config/    # Dockerfile, CMakeLists, conanfile
│   └── shared/
│       ├── api/schema/      # JSON entity schemas (source of truth)
│       │   ├── entities/    # 39 entity definitions
│       │   ├── events/      # event_config.json → workflow mappings
│       │   └── workflows/   # on_user_created.json etc.
│       └── seeds/database/  # Declarative JSON seed data
├── frontends/pastebin/
│   ├── src/                 # Next.js app (React + Redux + FakeMUI)
│   └── backend/             # Flask auth + Python runner
├── workflow/                # DAG workflow engine (TS, Python, C++ plugins)
├── gameengine/              # SDL3/bgfx 2D/3D engine (27/27 tests)
├── fakemui/                 # Material Design clone (167 components)
├── packages/                # 62 feature packages
├── deployment/              # Docker compose stack + build scripts
└── CLAUDE.md                # AI assistant guide (read first)
```

---

## DBAL Backends (14)

| Adapter | Backend |
|---------|---------|
| `memory` | In-process (testing) |
| `sqlite` | SQLite3 |
| `postgres` | PostgreSQL |
| `mysql` / `mariadb` | MySQL / MariaDB |
| `cockroachdb` | CockroachDB |
| `mongodb` | MongoDB |
| `redis` | Redis (cache layer) |
| `elasticsearch` | Elasticsearch (search layer) |
| `cassandra` | Cassandra |
| `surrealdb` | SurrealDB |
| `supabase` | Supabase REST |
| `prisma` | Prisma ORM bridge |

Switch adapter at runtime: `DATABASE_URL=sqlite://:memory: DBAL_ADAPTER=sqlite`

---

## Development

```bash
# Frontend (pastebin)
cd frontends/pastebin && npm run dev

# DBAL logs
docker logs -f metabuilder-dbal

# Admin seed endpoint (force re-seed)
curl -X POST http://localhost:8080/admin/seed \
  -H "Authorization: Bearer $DBAL_ADMIN_TOKEN" \
  -d '{"force": true}'

# Search docs / reports
cd txt && python3 reports.py search "topic"
cd docs && python3 docs.py search "topic"
```

---

## Schema-First Development

Entity schemas live in `dbal/shared/api/schema/entities/` as JSON.
They are the **single source of truth** — consumed by:
- C++ DBAL daemon (table creation, CRUD validation)
- `gen_types.py` (TypeScript + C++ type generation)
- Seed loader (entity-aware bulk insert)
- Workflow engine (entity creation steps)

```bash
# Regenerate types after schema changes
python3 dbal/shared/tools/codegen/gen_types.py
```

---

**Last Updated**: 2026-03-04
