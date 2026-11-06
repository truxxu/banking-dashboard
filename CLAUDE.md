# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite dev server, http://localhost:5173
npm run build       # tsc -b && vite build
npm run typecheck   # tsc -b (project references: tsconfig.app.json + tsconfig.node.json)
npm run lint        # oxlint (config in .oxlintrc.json)
npm run preview     # serve the production build
npx shadcn@latest add <component>   # add shadcn/ui components (new-york, neutral) into src/components/ui
```

There is no test runner yet (Vitest + Testing Library and a Playwright smoke test are planned per README).

Set `VITE_MOCK_ERROR_RATE` in `.env.local` (e.g. `0.15`) to make that fraction of mock API requests fail with 503, for exercising error/retry states.

## Architecture

Ledgerly is a front-end-only mock business banking dashboard (Vite 8, React 19, TypeScript 7, Tailwind v4, TanStack Query/Table, Recharts, react-hook-form + zod, React Router v7). There is **no real backend**: all `/api/*` requests are answered in the browser by MSW.

### Mock backend (`src/mocks/`)
- `main.tsx` dynamically imports `mocks/browser.ts` and awaits `startMockApi()` **before** the first render, so no request escapes the worker. The worker script is `public/mockServiceWorker.js` and is registered under `import.meta.env.BASE_URL` (matters for GitHub Pages sub-paths).
- `seed.ts` builds 12 months of data with faker under a fixed seed (deterministic). `db.ts` holds it in memory and persists to `localStorage` key `banking-dashboard:db`. **Bump `DB_VERSION` in `seed.ts` when the `Database` shape changes** — stale stored data with a different version is discarded and re-seeded.
- `handlers.ts` is the REST API. Every handler starts with `network()` (250–700ms latency, settles due transfers, optional random failure). Handler paths use a `*/api/...` prefix so they match regardless of base path. Mutations go through `updateDb()` so they persist.
- Transfers: `POST /api/transfers` creates a **pending** transaction; `settleDueTransfers()` posts it lazily on the next request after `SETTLE_MS` (6s), applying wire fees and crediting the destination for internal transfers. Internal transfers are excluded from money in/out totals in `buildSummary`.

### API layer (`src/api/`)
- `schemas.ts` is the single contract shared by the UI and the mock server: `transferRequestSchema` validates both the form (via zodResolver) and the POST handler; `transactionQuerySchema` parses both URL filter params and the handler's query string. Also exports `TRANSFER_FEES`, `TRANSFER_ETA`, `SETTLE_MS`.
- `client.ts`: `api<T>(path)` fetch wrapper (prefixes `/api`, throws `ApiRequestError` with `status`/`code`); `toSearchParams` drops empty values.
- `queries.ts`: all TanStack Query hooks plus the `qk` query-key factory. Use `qk` for keys; ledger-affecting mutations must invalidate accounts, `summary`, `transactions`, and `transaction` (see `invalidateLedger`). `useCreateTransfer` re-invalidates after `SETTLE_MS + 500` to pick up the pending → posted change.

### UI
- Routes (`App.tsx`) render inside `components/layout/AppShell`: `/` Overview, `/transactions`, `/insights`, `/payments`. Router `basename` derives from `BASE_URL`.
- **Transaction filters and the selected transaction (`?tx=`) live in the URL** via `features/transactions/useTransactionFilters.ts`; invalid params are dropped via zod; changing any filter resets `page`. Other pages link into filtered views by building these query strings.
- Shared building blocks: `components/shared/` (`Amount`, `StatusBadge`, `States` for loading/error/empty, `PageHeader`); shadcn primitives in `components/ui/`.
- Import alias `@/` → `src/`.

### Conventions
- **Money is integer cents** (`Cents` type) everywhere; convert only at the edges with `formatMoney` / `formatMoneyCompact` / `parseMoney` in `lib/money.ts`. Negative amounts are outflows. Never do float arithmetic on money.
- Date helpers (`dayKey`, `DAY_MS`) are in `lib/date.ts`; date filters compare `YYYY-MM-DD` day keys.

## Work in progress
Per README status: Payments page (`PaymentsPage.tsx`) is a stub — its header comment describes the intended multi-step transfer flow, and the API/hooks for it already exist. Insights charts, transaction date-range picker, Sheet drawer, and CSV export are also unbuilt.

## Deploy
- GitHub Pages: `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>/` (read by `vite.config.ts` as `base`) and copies `index.html` to `404.html` for deep links.
- Vercel: `vercel.json` provides SPA rewrites.
