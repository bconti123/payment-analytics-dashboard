# Frontend — Payment Analytics Dashboard

Next.js 16 (App Router) UI for the FastAPI backend in `../backend/`. Renders the dashboard summary, revenue/refund trend charts, and paginated tables for transactions and refunds.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** (CSS-first config) + **shadcn/ui** (`base-nova`, neutral, lucide)
- **TanStack Query** for server state, **Zod** for runtime API validation
- **Recharts** for the trend charts
- **next-themes** for light/dark with system preference
- **Vitest 4 + Testing Library** for component tests

## Quick start

```bash
cp .env.example .env.local        # NEXT_PUBLIC_API_BASE_URL — defaults to http://localhost:8000/api/v1
npm install
npm run dev                        # http://localhost:3000
```

The backend must be running and reachable at `NEXT_PUBLIC_API_BASE_URL`. From the repo root, `docker compose up --build` brings up Postgres + API + frontend together.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack on `:3000` |
| `npm run build` | Production build (standalone output) |
| `npm start` | Run the standalone build |
| `npm run lint` | ESLint |
| `npm test` | Vitest run, single pass |
| `npm run test:watch` | Vitest in watch mode |

## Project structure

```
frontend/
├── src/
│   ├── app/                           # App Router routes
│   │   ├── layout.tsx                 # Shell, providers, skip link
│   │   ├── providers.tsx              # ThemeProvider + QueryClientProvider
│   │   ├── page.tsx                   # / — dashboard
│   │   ├── transactions/page.tsx      # /transactions
│   │   └── refunds/page.tsx           # /refunds
│   ├── components/
│   │   ├── app-nav.tsx                # Sidebar (md+) + MobileNav (<md)
│   │   ├── theme-toggle.tsx           # next-themes Sun/Moon button
│   │   ├── dashboard/
│   │   │   ├── summary-cards.tsx
│   │   │   ├── revenue-trend-chart.tsx
│   │   │   └── refund-trend-chart.tsx
│   │   ├── transactions/transactions-table.tsx
│   │   ├── refunds/refunds-table.tsx
│   │   └── ui/                        # shadcn primitives (table, badge, button, card, skeleton)
│   ├── lib/
│   │   ├── api/                       # Typed client + Zod schemas mirroring backend shapes
│   │   │   ├── client.ts              # apiGet/apiPost, ApiError, query-string helper
│   │   │   ├── schemas.ts             # All Zod schemas + inferred types
│   │   │   └── { dashboard, transactions, refunds }.ts
│   │   ├── format.ts                  # Intl-based currency/percent/number helpers
│   │   └── utils.ts                   # cn()
│   └── test/
│       ├── setup.ts                   # jest-dom matchers + cleanup
│       └── render.tsx                 # renderWithQueryClient helper
├── scripts/
│   └── smoke-api.ts                   # `npx tsx` validates Zod schemas against a live API
├── Dockerfile                         # Multi-stage standalone build
├── next.config.ts                     # output: "standalone"
└── vitest.config.ts                   # jsdom env, alias @/*
```

## Architecture notes

**API layer.** Every endpoint goes through `apiGet`/`apiPost` in `src/lib/api/client.ts`, which validates the response against a Zod schema and throws `ApiError` on non-2xx. The schemas in `src/lib/api/schemas.ts` mirror the backend's Pydantic shapes — decimals, UUIDs, and datetimes stay as strings (matching the JSON wire format) and are formatted at render time.

**State.** Server state lives in TanStack Query (60s `staleTime`, no refetch-on-focus). Filter and pagination state is local `useState` in each table — keeps URL behavior simple at the cost of non-shareable filter URLs (a deliberate trade-off; URL syncing would be a polish follow-up).

**Validation.** Filter inputs are validated inline before firing requests — e.g. an end date earlier than the start date shows an `role="alert"` message and `enabled: false` skips the fetch. The principle: stop bad requests at the boundary rather than rendering empty results.

**Theming.** `next-themes` flips a `.dark` class on `<html>`; Tailwind's `dark:` variant and the CSS tokens in `globals.css` do the rest. The toggle is wrapped in `dynamic(..., { ssr: false })` so it never SSRs the wrong theme.

## Tests

Four critical-path tests live next to the components they exercise:

- `summary-cards.test.tsx` — happy path renders KPI values; error path renders the alert banner
- `transactions-table.test.tsx` — invalid date range blocks the fetch and shows the inline error; changing a filter resets pagination to page 1

Tests mock the API client directly with `vi.mock("@/lib/api", ...)` and use a fresh `QueryClient` per test (via `renderWithQueryClient`) so query caches don't leak between tests.

## Smoke test against a live API

```bash
npx tsx scripts/smoke-api.ts
```

Hits every endpoint and parses each response through its Zod schema. Useful after any backend or schema change to confirm the contract still holds.

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL (with `/api/v1` suffix) | `http://localhost:8000/api/v1` |

`NEXT_PUBLIC_*` values are inlined at build time. Changing them requires a rebuild (`npm run build` or rebuild the Docker image).
