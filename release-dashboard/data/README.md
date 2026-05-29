# Data folder

Every `*.csv` in this folder becomes one or more release scorecards on the
dashboard. The server watches this folder and re-ingests on save (within
~500 ms).

## Two ways to add a release

### 1. The easy way — upload from the dashboard

Open the dashboard → **Upload CSV** button (top right of "All Releases").
Pick the file → it lands here and immediately appears on the dashboard.

### 2. The manual way

Drop a `*.csv` file into this folder. The server's file watcher picks it up.

## CSV format

Use [sample_release_simple.csv](sample_release_simple.csv) as a starting
template. Every column is optional except `Project Name` and `Release
Version` (the two together form the unique release id).

| Column | What it is |
| --- | --- |
| **Project Name** | Required. Groups releases into one project tab. |
| **Release Version** | Required. e.g. `v1.0.0`. Same project + version overwrites; change one to add a new card. |
| **Customer Name** | Optional. |
| **Owner**, **Release Date** | Optional metadata. |
| **Test Pass Rate %** | 0–100. Feeds the score. |
| **Automation Coverage %** | 0–100. Feeds the score. |
| **MTTR (hrs)** | Hours to resolve. |
| **SQA Bugs**, **SIT Bugs**, **Production Bugs** | Counts per stage. |
| **Critical Bugs Open** | Open criticals — feeds the score (inverted). |
| **JIRA IDs** | Comma-separated, e.g. `GM-1001, GM-1002`. These show as clickable badges that open the issue in JIRA. |

### Issue cards (up to N slots — just add more numbered columns)

For each issue you want to track, add the columns `Issue N <Field>`:

| Field | Notes |
| --- | --- |
| `Issue N JIRA ID` | If present, the card title links to JIRA. |
| `Issue N Title` | Required for the issue to be rendered. |
| `Issue N Severity` | `critical` / `high` / `medium` / `low` |
| `Issue N RCA` | Root cause analysis (free text). |
| `Issue N CAPA` | Corrective action (free text). |
| `Issue N Owner`, `Issue N Due Date` | Optional. |

The original `CAPA N <Field>` naming from the legacy DHL CSV still works —
both prefixes are recognised.

### Team learnings (up to N slots)

| `Learning N Team` | Free string — team name appears as a column header. |
| `Learning N Note` | The learning. |
| `Learning N Owner`, `Learning N Due Date` | Optional. |

Default visible teams: Engineering, QA, Product, Solutions. Anything else
you add (e.g. `Architecture`, `DevOps`) appears automatically.

## Backward compatibility

The rich DHL Figgs schema (Product / Module / SA-SI breakdowns, per-stage
CAPA narratives) still works — see [dhl_figgs_scorecard.csv](dhl_figgs_scorecard.csv).
The parser handles both shapes.

## Linking to JIRA

For JIRA badges to be clickable, the server needs `JIRA_BASE_URL` in
`.env` (already set to `https://greyorange-work.atlassian.net`). The
frontend reads this via `/api/config`. Without it, JIRA IDs still show
but as plain text.
