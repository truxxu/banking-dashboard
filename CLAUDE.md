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
- `db.scheduled` is a discriminated union on `kind` (`transfer` | `request` | `deposit`), processed lazily by `processScheduled()` in `network()`.
- Transfers: `POST /api/transfers` creates a **pending** transaction; `processScheduled()` posts it lazily on the next request after `SETTLE_MS` (6s), applying wire fees and crediting the destination for internal transfers. Internal transfers are excluded from money in/out totals in `buildSummary`.

- Payment requests: `POST /api/payment-requests` creates an `open` request and schedules a `request` job `REQUEST_PAY_MS` (8s) later; that marks it `paid`, links `transactionId`, and adds a **pending** Revenue deposit, which a `deposit` job posts `SETTLE_MS` later (credits `balanceCents`; incoming funds never touch `pendingCents`). Seeded open requests have no job, so they stay open. `POST /api/payment-requests/:id/cancel` only works while open.

### API layer (`src/api/`)
- `schemas.ts` is the single contract shared by the UI and the mock server: `transferRequestSchema` and `paymentRequestSchema` validate both the form (via zodResolver) and the POST handler; `transactionQuerySchema` parses both URL filter params and the handler's query string. Also exports `amountCentsSchema`, `TRANSFER_FEES`, `TRANSFER_ETA`, `SETTLE_MS`, `REQUEST_PAY_MS`.
- `client.ts`: `api<T>(path)` fetch wrapper (prefixes `/api`, throws `ApiRequestError` with `status`/`code`); `toSearchParams` drops empty values.
- `queries.ts`: all TanStack Query hooks plus the `qk` query-key factory. Use `qk` for keys; ledger-affecting mutations must invalidate accounts, `summary`, `transactions`, and `transaction` (see `invalidateLedger`). `useCreateTransfer` re-invalidates after `SETTLE_MS + 500` to pick up the pending → posted change; `useCreatePaymentRequest` re-invalidates after `REQUEST_PAY_MS + 500` and `REQUEST_PAY_MS + SETTLE_MS + 500`.

### UI
- Routes (`App.tsx`) render inside `components/layout/AppShell`: `/` Overview, `/transactions`, `/payments` (send), `/receive` (account details), `/requests` (payment requests) (Insights was merged into Overview; `/insights` falls through to the catch-all redirect). Router `basename` derives from `BASE_URL`.
- **Transaction filters and the selected transaction (`?tx=`) live in the URL** via `features/transactions/useTransactionFilters.ts`; invalid params are dropped via zod; changing any filter resets `page`. Other pages link into filtered views by building these query strings.
- The date-range filter (`features/transactions/DateRangeFilter.tsx`) edits a draft and commits `from`/`to` together via `setDateRange` when the popover closes. Convert day keys with `dayKey` / `parseDayKey` (local time, never `new Date('YYYY-MM-DD')`).
- The transaction drawer is a shadcn `Sheet` opened from table rows (no `SheetTrigger`), so it restores focus to the opening element itself.
- Overview's Money in/out cards (`features/overview/CategoryFlowCard.tsx`) always use `useSummary(30)`, independent of the balance card's period switcher. `categoryTotals.ts` sums `cashFlowSeries[].inByCategory/outByCategory` into per-category totals (top 5 + Other), rendered as HTML horizontal bars where each bar links to the filtered transactions view.
- Send money (`features/payments/TransferFlow.tsx`): one react-hook-form instance over `transferRequestSchema`, stepped From → To → Amount → Review, then `TransferSuccess`. Steps validate their own fields with `trigger` (zod v4 skips the object-level `.refine`s while other fields are invalid, so the destination check is done by hand). Picking a destination sets exactly one of `recipientId`/`toAccountId` and a compatible `method`. The amount input keeps raw text and writes `parseMoney(text) ?? NaN` to `amountCents`. The available-funds check (`available()` in `transfer.ts`) runs client-side before Review; the server's 422 is the backstop.
- Receive money (`features/receive/`): `pages/ReceivePage.tsx` shows only `AccountDetailsCard`; `pages/RequestsPage.tsx` holds the request flow and list. `RequestFlow` mirrors `TransferFlow` (Deposit to → Payer → Details → Review → `RequestSuccess`, which follows the live request and its linked transaction). `RequestsList` lists requests with cancel; `AccountDetailsCard` shows routing/account numbers with copy. `RadioCard`, `FieldError`, `AmountInput` are shared by both flows from `features/payments/fields.tsx`.
- Shared building blocks: `components/shared/` (`Amount`, `StatusBadge`, `States` for loading/error/empty, `PageHeader`); shadcn primitives in `components/ui/`.
- Import alias `@/` → `src/`.

### Conventions
- **Money is integer cents** (`Cents` type) everywhere; convert only at the edges with `formatMoney` / `formatMoneyCompact` / `parseMoney` in `lib/money.ts`. Negative amounts are outflows. Never do float arithmetic on money.
- Date helpers (`dayKey`, `DAY_MS`) are in `lib/date.ts`; date filters compare `YYYY-MM-DD` day keys.

## Work in progress
Per README status: on Transactions, the "Export CSV" and "Download receipt" buttons are placeholders (no-op / disabled).

## Deploy
- GitHub Pages: `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>/` (read by `vite.config.ts` as `base`) and copies `index.html` to `404.html` for deep links.
- Vercel: `vercel.json` provides SPA rewrites.
