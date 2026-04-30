# Payment Analytics Dashboard

A full-stack payment analytics dashboard that helps businesses track transactions, refunds, revenue trends, and operational metrics.

**Status:** Backend MVP complete. Frontend (React/Next.js) planned next.

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

**Frontend (planned)** — React or Next.js

## Architecture

```
┌──────────────────────┐         HTTPS / JSON
│  Frontend (planned)  │ ─────────────────────────┐
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

Routers stay thin; services own queries and business rules; schemas enforce the API contract. Domain exceptions (`NotFoundError`, `BusinessRuleError`) keep services HTTP-agnostic so they're testable without FastAPI.

## Project structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, router includes
│   ├── core/
│   │   ├── config.py            # Pydantic settings (.env-anchored)
│   │   └── database.py          # Engine, SessionLocal, get_db
│   ├── models/                  # SQLAlchemy ORM (customers, transactions, refunds)
│   ├── schemas/                 # Pydantic request/response shapes
│   ├── routers/                 # transactions, refunds, dashboard
│   └── services/                # transaction, refund, analytics
├── alembic/                     # migrations
├── alembic.ini
├── scripts/
│   └── seed.py                  # Faker-based local data
├── tests/                       # pytest (13 tests, real Postgres)
├── pytest.ini
├── .env.example
└── requirements.txt
```

## Local setup

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

## Roadmap (post-MVP)

- React/Next.js frontend with charts
- CSV import via pandas (Stripe-style exports)
- Auth (JWT) and role-based access
- Multi-currency normalization (daily FX rates)
- Redis caching for dashboard summary
- Anomaly detection on daily revenue (z-score)
- AI-generated weekly narrative via the Claude API
- Dockerfile + docker-compose for one-command setup
- GitHub Actions CI (pytest + ruff)

## License

MIT — see [LICENSE](LICENSE).
