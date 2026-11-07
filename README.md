# Ledgerly — mock business banking dashboard

A Mercury/Slash-style banking dashboard built as a front-end exercise. Everything runs in the browser: a
[Mock Service Worker](https://mswjs.io) API serves seeded, realistic data and persists changes to
`localStorage`, so the app behaves like it's talking to a real bank backend.

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york, neutral) |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v9 |
| Charts | Recharts v3 |
| Forms & validation | react-hook-form + zod (schemas shared with the mock API) |
| Routing | React Router v7 |
| Mock backend | MSW v3 + `@faker-js/faker` (fixed seed) |

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build
npm run typecheck
```

Copy `.env.example` to `.env.local` and set `VITE_MOCK_ERROR_RATE=0.15` to make ~15% of requests fail, so you can demo error and retry states.

Add more shadcn/ui components the usual way: `npx shadcn@latest add sheet dialog select`.

## Project structure

```
src/
  api/          client.ts (fetch wrapper), queries.ts (TanStack Query hooks + keys),
                schemas.ts (zod contract shared by client and mock), types.ts
  mocks/        seed.ts (12 months of seeded data), db.ts (localStorage persistence),
                handlers.ts (the mock REST API), browser.ts (worker setup)
  components/   ui/ (shadcn), shared/ (Amount, StatusBadge, states), layout/AppShell
  features/     transactions/ (table, filters-in-URL hook, date-range filter, detail drawer),
                overview/ (money in/out category bars), payments/ (send money flow),
                receive/ (payment requests, account details)
  pages/        Overview, Transactions, Payments, Receive (account details), Requests
  lib/          money.ts (integer cents + Intl formatting), date.ts, utils.ts
```

## Mock API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/accounts` | Balances + pending holds |
| GET | `/api/summary?days=30` | Total cash, in/out, balance series, daily cash flow with per-category in/out, spend by category |
| GET | `/api/transactions` | `q`, `accountId`, `category`, `status`, `direction`, `from`, `to`, `page`, `pageSize` |
| GET / PATCH | `/api/transactions/:id` | PATCH `{ memo }` |
| GET | `/api/recipients` | Saved payees |
| POST | `/api/transfers` | Validates funds and the method. Creates a **pending** transaction that **posts** ~6s later (wire fee applied, internal transfers credit the destination) |
| GET | `/api/customers` | Saved payers for payment requests |
| GET / POST | `/api/payment-requests` | POST creates an **open** request; the mock customer pays it ~8s later, creating a pending Revenue deposit that **posts** ~6s after that |
| POST | `/api/payment-requests/:id/cancel` | Open requests only (409 otherwise) |
| POST | `/api/demo/reset` | Re-seed |

Requests have 250–700ms of simulated latency. Internal transfers are left out of money in/out totals.

## Design decisions

- **Money is integer cents** everywhere; it's only converted at the edges (`lib/money.ts`).
- **Filters live in the URL**, so filtered views survive refresh and can be shared, and the overview links straight into them.
- **One contract**: `transferRequestSchema` validates both the form and the mock "server".
- **Pending → posted** is settled lazily on the next request, so it survives page reloads.

## Status

- [x] Overview: total cash, period switcher, balance chart, accounts, recent activity
- [x] Overview: money in / money out bar charts of totals by category (follows the selected period, top 5 + Other; bar → filtered transactions). Replaces the separate Insights page
- [x] Transactions: search, filters, pagination, detail panel with timeline + editable memo
- [x] Transactions: date-range picker (presets + calendar), Sheet drawer
- [ ] Transactions: CSV export (button is in place, not wired up), receipt download
- [x] Send money: multi-step transfer flow (from → to → amount & method → review → success), with live pending → posted status
- [x] Receive money: request-payment flow (deposit to → payer → amount & terms → review → success) with live open → paid → deposited status, requests list with cancel, account/routing details with copy
- [ ] Tests: Vitest + Testing Library on filters/transfer form, one Playwright smoke test

## Deploy

**GitHub Pages:** push to `main`, then set *Settings → Pages → Source* to **GitHub Actions**. The workflow
builds with `BASE_PATH=/<repo-name>/` and copies `index.html` to `404.html` so deep links work.

**Vercel:** import the repo. Framework preset: Vite. `vercel.json` handles SPA rewrites.
