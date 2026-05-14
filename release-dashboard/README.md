# Release Dashboard

A self-contained release scorecard dashboard: ingest CSVs (and optionally JIRA),
score each release 0–100, surface RCA/CAPA + team learnings, and export to PDF.

```
CSV files / JIRA API
       ↓
  ingestCSV.js  →  JSON store
       ↓
  scorecard.js  →  score + go/nogo
       ↓
  Express API   →  /api/projects/*
       ↓
  React frontend (tabs · metrics · RCA/CAPA · learnings)
       ↓
  PDF export (puppeteer headless render)
       ↓
  Docker       →  http://localhost:3000
```

## Quick start

```bash
# 1. install
npm install

# 2. drop CSVs into ./data, then ingest
npm run ingest

# 3a. dev (vite frontend + express api with hot reload)
npm run dev
#  → http://localhost:5173

# 3b. production-style (build SPA + serve from Express)
npm run build
npm start
#  → http://localhost:3000
```

The dev server (`vite`) runs on `5173` and proxies `/api/*` to the Express
backend on `3000`.

## Adding a new project

1. Drop a scorecard CSV into [`./data`](./data). Either of the schemas in
   `Release_Scorecard/*.csv` works; new columns are tolerated.
2. Run `npm run ingest` (re-runnable; existing records are updated by `id`,
   not duplicated).
3. Reload the dashboard — the new project appears as a tab automatically.

The ingester reads every `*.csv` under the folder passed via `--dir`, defaulting
to `./data`. Each CSV row becomes one release record.

## CSV schema (canonical record)

`scripts/ingestCSV.js` maps each row → this shape via
[`server/csvParser.js`](server/csvParser.js):

```ts
{
  id, projectName, releaseVersion, customerName, currentBuildVersion,
  owner, releaseDate,

  // score inputs
  testPassRate, automationCoverage, criticalBugsOpen,
  totalBugs, escapedDefects, mttr, slaAdherence,

  // DHL-style bug stages
  stages: { sqa, sit, production }   // each { product, module, saSi, total, capa }

  // RCA/CAPA + learnings
  issues:        [{ id, title, severity, rca, capa, owner, dueDate, team, stage }],
  teamLearnings: [{ team, learning, owner, dueDate }],
}
```

CAPA notes in the CSV become synthetic issue cards so the UI has something to
render even before JIRA is connected.

## Score model

Weighted 0–100 ([`server/scorecard.js`](server/scorecard.js)):

| Input               | Weight | Direction |
| ------------------- | ------ | --------- |
| Test pass rate      | 25%    | higher = better |
| Automation coverage | 20%    | higher = better |
| Critical bugs open  | 20%    | lower = better (cap: 5) |
| Escaped defects     | 20%    | lower = better (cap: 5) |
| SLA adherence       | 15%    | higher = better |

Missing inputs are skipped and remaining weights are renormalised — a partial
release still gets a comparable score. Recommendation: ≥80 = **go**,
≥60 = **conditional**, otherwise **nogo**.

## API surface

| Method | Path | Returns |
| --- | --- | --- |
| GET    | `/api/health`                  | `{ ok, releases }` |
| GET    | `/api/projects`                | latest release per project (with `scorecard`) |
| GET    | `/api/projects/:id`            | one release + capa list |
| GET    | `/api/projects/:id/history`    | score trend across releases for that project |
| POST   | `/api/projects/:id/capa`       | upsert a CAPA entry |
| POST   | `/api/projects/:id/sync`       | force-refresh JIRA for that release |
| GET    | `/api/jira/:key/:fixVersion`   | preview a JIRA fetch (no write) |
| GET    | `/api/export/:id/pdf`          | puppeteer-rendered PDF |

## JIRA integration

Live JIRA sync is **off by default**. Enable it by copying `.env.example` to
`.env` and filling in:

```
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@yourorg.com
JIRA_API_TOKEN=<token>
JIRA_PROJECT_KEYS=DHL,WMS,RBC
JIRA_POLL_INTERVAL_MS=300000
```

Behavior when enabled:
- Polls every release in the store on a 5-minute timer.
- Manual refresh via `POST /api/projects/:id/sync` or the **Sync JIRA** button.
- Bug list, severity counts, and `criticalBugsOpen` get patched into the
  release record; results are cached for 5 minutes.
- Project-key matching is fuzzy: any token in `JIRA_PROJECT_KEYS` whose
  lowercased form appears in the `projectName` is used. To override per
  release, set `jiraProjectKey` on the record.

If JIRA env vars are blank, the poller no-ops and the API still works.

## PDF export

`GET /api/export/:id/pdf` launches a headless Chromium via puppeteer, opens
`/projects/:id?print=true`, and renders the page to PDF. The `?print=true`
query toggles a body class that hides nav, tabs, and action buttons via CSS.

> The first PDF call downloads Chromium (~150 MB). Subsequent calls are fast.

## Publishing

### Docker (recommended)

```bash
docker compose up -d --build
# Dashboard live at http://localhost:3000
```

The image runs `npm run build && npm start`. Mount your CSV folder if you want
to ingest from the host:

```bash
docker compose run --rm app npm run ingest -- --dir /app/data
```

### Bare-metal / PM2

```bash
npm install --omit=dev
npm run build
pm2 start npm --name release-dashboard -- start
```

Reverse-proxy port 3000 behind nginx/Caddy for TLS.

## Project layout

```
release-dashboard/
├── server/
│   ├── index.js          # Express API
│   ├── csvParser.js      # CSV → release record
│   ├── scorecard.js      # Weighted 0–100 scoring
│   ├── jira.js           # JIRA fetcher + poller
│   ├── pdf.js            # puppeteer renderer
│   └── store.js          # JSON-file store
├── src/
│   ├── App.jsx           # nav + tabs + routing
│   ├── api.js            # axios client
│   ├── components/       # ScoreRing, MetricsGrid, IssueCard, …
│   └── data/mockData.js  # offline fallback
├── scripts/
│   └── ingestCSV.js      # one-shot loader
├── data/                 # CSVs + store.json (git-ignored)
├── Dockerfile
├── docker-compose.yml
└── README.md
```
