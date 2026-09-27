# Sked

A personal recurring scheduler. You enter a start date and a seven-day work/off pattern once. Every later date is calculated from that original start date, including dates in later months and years.

The site is a static Next.js export. There is no application backend, database, or scheduling service.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run test` | Recurrence and validation unit tests |
| `npm run lint` | ESLint |
| `npm run build` | Production static export to `out/` |

## Build and deploy

```bash
npm run build
```

Publish the contents of `out/` on any static host over HTTPS. Do not use `next start` as the production model, and do not open `out/index.html` as a file URL if you need reliable browser storage.

No API base URL, database credential, or environment secret is required.

## Storage

- Browser key: `recurring-scheduler:data`
- Schema version: `1`
- One local schedule per browser origin
- JSON backup/restore is the supported way to copy a schedule to another device or browser profile

Clearing site data, using another device, or changing origin does not keep the schedule. A backup file is not encrypted.

## Tests

```bash
npm test
```

The unit tests cover the documented recurrence fixtures, leap days, non-Monday anchors, end dates, and overnight shift rules.
