# Payment Analytics Dashboard

[![CI](https://github.com/bconti123/payment-analytics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/bconti123/payment-analytics-dashboard/actions/workflows/ci.yml)

A full-stack payment analytics dashboard that helps businesses track transactions, refunds, revenue trends, and operational metrics.

**Live demo:**
- Frontend: https://payment-analytics.vercel.app
- API: https://payment-analytics-api-production.up.railway.app · [Swagger UI](https://payment-analytics-api-production.up.railway.app/docs)

Sign in with `admin@example.com` / `devpassword` (or `viewer@example.com` for read-only).

**Status:** Deployed to production — Vercel (Next.js frontend) + Railway (FastAPI in a persistent container) backed by Neon Postgres. Also runnable locally with one `docker compose up`.

## Tech stack

**Backend**
- Python 3.10+
- FastAPI — async-ready HTTP layer with auto-generated OpenAPI docs
- SQLAlchemy 2.x — ORM, modern `Mapped[...]` style
- PostgreSQL 14+
- Alembic — schema migrations
- Pydantic v2 + pydantic-settings — request/response validation, typed config
- pytest + httpx — test suite hitting a real Postgres instance
- Faker — local seed data

**Frontend**
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (lucide icons)
- TanStack Query for server state, Zod for runtime API validation
- Recharts for trend visualizations
- next-themes for light/dark
- Vitest + Testing Library for component tests

See [`frontend/README.md`](frontend/README.md) for full frontend docs.

## Architecture

```
┌──────────────────────┐         HTTP / JSON
│  Next.js frontend    │ ─────────────────────────┐
│  ─────────────────   │                          │
│  App Router pages    │                          │
│      ▼               │                          │
│  TanStack Query +    │                          │
│  Zod-validated       │                          │
│  API client          │                          │
└──────────────────────┘                          ▼
                                       ┌─────────────────────┐
                                       │   FastAPI App       │
                                       │  ─────────────────  │
                                       │  Routers (HTTP)     │
                                       │      ▼              │
                                       │  Services (logic)   │
                                       │      ▼              │
                                       │  SQLAlchemy ORM     │
                                       │  + Pydantic schemas │
                                       └──────────┬──────────┘
                                                  │  SQL
                                                  ▼
                                       ┌─────────────────────┐
                                       │   PostgreSQL        │
                                       │  customers, txns,   │
                                       │  refunds            │
                                       └─────────────────────┘
```

Routers stay thin; services own queries and business rules; schemas enforce the API contract. Domain exceptions (`NotFoundError`, `BusinessRuleError`) keep services HTTP-agnostic so they're testable without FastAPI. On the frontend, the same shapes are mirrored as Zod schemas so contract drift surfaces at runtime instead of in production logs.

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router includes
│   │   ├── core/                    # config, database
│   │   ├── models/                  # SQLAlchemy ORM (customers, transactions, refunds)
│   │   ├── schemas/                 # Pydantic request/response shapes
│   │   ├── routers/                 # transactions, refunds, dashboard
│   │   └── services/                # transaction, refund, analytics
│   ├── alembic/                     # migrations
│   ├── scripts/seed.py              # Faker-based local data
│   ├── tests/                       # pytest, real Postgres
│   ├── Dockerfile
│   └── .env.example
├── frontend/                        # Next.js app — see frontend/README.md
│   ├── src/
│   │   ├── app/                     # App Router routes
│   │   ├── components/              # dashboard, transactions, refunds, ui (shadcn)
│   │   ├── lib/api/                 # Typed client + Zod schemas
│   │   └── test/                    # Vitest setup + render helper
│   ├── Dockerfile                   # Multi-stage standalone build
│   └── vitest.config.ts
├── db/init.sql                      # Creates payment_analytics_test on first boot
├── docker-compose.yml               # db + api + web
└── README.md                        # this file
```

## Run with Docker (one command)

The fastest way to run the whole stack — Postgres + API + frontend — with no local Python, Node, or DB install.

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000  (Swagger UI at `/docs`)
- Postgres: `localhost:5433` (mapped from container 5432 — avoids clashing with a local Postgres)
- Migrations run automatically on container start (`alembic upgrade head`).
- Both `payment_analytics` and `payment_analytics_test` are created on first boot.

Seed local data (recommended on first run, otherwise the dashboard is empty):

```bash
docker compose exec api python -m scripts.seed
```

Run tests inside the container:

```bash
docker compose exec api pytest
```

Tear down (keeps the data volume):

```bash
docker compose down
```

Wipe the database too:

```bash
docker compose down -v
```

> **Port 5432 already in use?** Either keep the default 5433 mapping in `docker-compose.yml` (recommended — both can coexist), or stop the local service first: `sudo systemctl stop postgresql`, then change `5433:5432` to `5432:5432`.

## Local setup (without Docker)

### 1. Prerequisites

- Python 3.10+
- PostgreSQL 14+ running locally
- A Postgres user with `CREATEDB` permission

### 2. Create databases

```bash
createdb payment_analytics
createdb payment_analytics_test     # for the test suite
```

### 3. Python environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env to match your Postgres credentials
```

The default URL assumes `postgres:postgres@localhost:5432`. If you use peer authentication on Linux (no password), the file shows the socket-form alternative.

### 5. Apply migrations

```bash
alembic upgrade head
```

### 6. Seed local data (optional but recommended)

```bash
python -m scripts.seed              # 50 customers, 500 transactions, ~30 refunds
python -m scripts.seed --reset      # wipe and re-seed
```

## Running the API

```bash
cd backend
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- Alternative docs (ReDoc): http://localhost:8000/redoc

## Running tests

```bash
cd backend
pytest                                 # all tests
pytest -v                              # verbose
pytest tests/test_dashboard.py         # one file
pytest -k refund                       # by name pattern
```

Tests run against `payment_analytics_test` with per-test `SAVEPOINT` rollback, so the dev database is never touched.

## Deploy (Vercel + Railway + Neon)

Production runs as three pieces:

- **Frontend** — Next.js on **Vercel**, deployed from `frontend/`. Single env var `NEXT_PUBLIC_API_BASE_URL` baked in at build time.
- **Backend** — FastAPI on **Railway** as a persistent container. `railway.json` points at `backend/Dockerfile`; the Dockerfile runs `alembic upgrade head` then `uvicorn` on the Railway-injected `$PORT`. Migrations apply automatically on every deploy.
- **Database** — **Neon** (serverless Postgres) with a pooled connection string.

Backend env vars (set with `railway variables --set`):
- `DATABASE_URL` — Neon **pooled** connection string (the one with `-pooler` in the host).
- `JWT_SECRET` — `python3 -c "import secrets; print(secrets.token_urlsafe(32), end='')"` (the `end=''` matters — a trailing newline gets stored as part of the secret).
- `ANTHROPIC_API_KEY` — optional, enables the weekly insight card.
- `CORS_EXTRA_ORIGINS` — comma-separated list of additional allowed origins (e.g. the deployed frontend URL).

One-time database setup (the migration runs automatically on Railway after this, so this is just for first-time seeding):

```bash
cd backend
DATABASE_URL='<neon-pooled-url>' alembic upgrade head
DATABASE_URL='<neon-pooled-url>' python -m scripts.seed
```

Then `railway up --service payment-analytics-api` for the backend and `vercel --prod` from `frontend/`. Push to `main` auto-redeploys both.

### Why this split

- **Vercel for the frontend** — Next.js's home turf, free Hobby tier, build/preview/production flow is excellent.
- **Railway for the backend** — a persistent FastAPI process avoids the gotchas of serverless Python (per-invocation in-memory caches, cold starts on idle, connection-pool churn against Postgres). Cost is small (Railway free trial credit covers an idle container; pay-as-you-go after).
- **Neon for the DB** — pooled connection string handles whatever connection pattern the backend chooses; persistent Railway connections work fine, and it stays a drop-in if the backend ever moves back to serverless.

## API reference

All endpoints are prefixed with `/api/v1`.

### Transactions

| Method | Path | Description |
|---|---|---|
| `GET` | `/transactions` | List with filters: `status`, `method`, `start`, `end`, `page`, `page_size` |
| `GET` | `/transactions/{id}` | Get one (with customer + refunds eager-loaded) |
| `POST` | `/transactions` | Create |

### Refunds

| Method | Path | Description |
|---|---|---|
| `GET` | `/refunds` | List with filters: `start`, `end`, `page`, `page_size` |
| `POST` | `/refunds` | Create — flips parent transaction to `refunded` when fully refunded |

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Revenue, counts, refund rate, AOV for a date range (defaults to last 30 days) |
| `GET` | `/dashboard/revenue-trend` | Bucketed revenue series — `interval=day\|week\|month` |
| `GET` | `/dashboard/refund-trend` | Bucketed refund series |

### Auth

JWT bearer auth (HS256) protects all API routes except `/health` and `/`. Two roles:
- **admin** — reads everything plus writes (transactions, refunds, CSV import) and the paid weekly insight call.
- **viewer** — reads everything; gets `403` on writes.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Form-encoded `username` + `password` (OAuth2 password flow). Returns a 60-min access token. |
| `GET` | `/auth/me` | Current user. |
| `POST` | `/auth/register` | Admin-only. New users default to `viewer`. |

Local dev seeds `admin@example.com` and `viewer@example.com`, both with password `devpassword`.

### Other

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check (also pings the DB) |
| `GET` | `/docs` | OpenAPI Swagger UI |

### Example

```bash
curl 'http://localhost:8000/api/v1/dashboard/summary?start=2026-04-01&end=2026-04-29'
```

```json
{
  "range": { "start": "2026-04-01", "end": "2026-04-29" },
  "total_revenue": "48003.64",
  "transaction_count": 228,
  "successful_count": 195,
  "failed_count": 14,
  "refund_total": "2617.53",
  "refund_rate": 0.0545,
  "average_order_value": "246.17",
  "currency": "USD"
}
```

## Auth design notes

A few deliberate tradeoffs worth flagging since they're the questions a reviewer will ask:

- **JWT in `localStorage`** rather than `httpOnly` cookies. Simpler for a portfolio app with no XSS surface; for a real deployment I'd switch to httpOnly + a CSRF token (or use a managed auth provider).
- **No refresh tokens.** 60-minute access token; users re-login per session. Refresh-token rotation is real engineering for ~zero portfolio payoff.
- **Role embedded in JWT claims.** Saves a per-request DB lookup, at the cost of role changes only taking effect after token expiry.
- **Two roles** (`admin`, `viewer`) — minimum to demonstrate RBAC without inventing tiers for show.
- **Admin-only registration** — this is a payments dashboard, not a SaaS signup form.
- Crypto via `pwdlib` (bcrypt) and `pyjwt` — both are the maintained successors to the libraries most older tutorials still recommend (`passlib`, `python-jose`).

## Roadmap (post-MVP)

- Multi-currency normalization (daily FX rates)
- Redis caching for dashboard summary

## License

MIT — see [LICENSE](LICENSE).
