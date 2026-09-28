# Coaching Institute Fee Manager - Mini MVP

A single-admin, local-first fee manager built with Next.js 15, TypeScript, Prisma and SQLite. No payment gateway, WhatsApp API, parent portal, subscriptions, or third-party account needed.

## Start locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Edit .env: set a private ADMIN_EMAIL, a strong 12+ character ADMIN_PASSWORD,
# a random 32+ character SESSION_SECRET and your INSTITUTE_NAME.
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with the admin credentials you set. Keep `.env` private. This is a local demo; production deployment needs a persistent database and real secret management. The included Render free-tier blueprint uses a throwaway public demo login and is a disposable demo: SQLite data can disappear whenever the service restarts or redeploys. Never enter real student or payment data there.

## Core workflow

1. Create an active batch, then an active student in that batch.
2. Create a fee for a student and month. The student's monthly fee pre-fills the total, but can be adjusted.
3. Record one or more payments, each up to the outstanding amount; each payment gets a unique `REC-00001`-style receipt.
4. Download a receipt PDF or print it; see fees, balances and collection on the dashboard.
5. On Pending Fees, copy a ready-made reminder. No message is sent.

Student and batch deactivation requires confirmation. Inactive students cannot receive new fee records; inactive batches cannot be assigned to new students. Existing fees and payments remain visible. Financial records have no delete endpoint. Fee status is derived from payment total and due date (Paid wins over Overdue; an unpaid past-due fee is Overdue). Money is stored in integer paise. Fee month is unique per student.

## Structure

- `prisma/schema.prisma`: Admin, Batch, Student, Fee, Payment, Receipt relationships.
- `lib/core.ts`: money, date and fee-status rules.
- `lib/auth.ts`: signed HTTP-only admin session, eight-hour expiry.
- `app/api`: login/logout, summary, resource routes, receipt read.
- `app/page.tsx`: responsive dashboard and forms; light/dark switch.
- `tests/core.test.mjs`: business-rule unit tests.
- `tests/flow.mjs`: browser flow, screenshots and recording (requires local Google Chrome and `playwright-core`; this dev-only test dependency is not installed by default).

For the browser test, install `npm install --no-save playwright-core`, run `npx playwright install ffmpeg` if recording, then `node tests/flow.mjs`. It uses the private environment credentials; it is designed for a fresh disposable test database, so reset the local database before running it. `tests/flow.mjs` targets local port 3210. Never use its demo password on a public host.

## Scope notes

This is a one-admin mini MVP, not a hosted SaaS. The copy-only reminder intentionally does not call WhatsApp. The PDF embeds a DejaVu Sans font so its ₹ sign renders correctly; the font is included with the source. Date-only fields are stored as UTC midnight and displayed as calendar dates. Collection uses the current month in Asia/Kolkata. Database backups are the operator's responsibility before any real use.
