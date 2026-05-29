# Release Scorecard Dashboard

An interactive Streamlit dashboard that publishes release-quality metrics from a CSV
([release_scorecard.csv](release_scorecard.csv)) — KPIs, score trends, bug breakdowns,
test coverage, release health, and retro notes.

## Contents

| File | Purpose |
| --- | --- |
| [generate_release_scorecard.py](generate_release_scorecard.py) | Generates the scorecard CSV template (filled + blank). |
| [release_scorecard.csv](release_scorecard.csv) | The data the dashboard reads. Edit this with each release. |
| [release_scorecard_blank.csv](release_scorecard_blank.csv) | Empty template with just the header row. |
| [publish_release_scorecard.py](publish_release_scorecard.py) | The Streamlit dashboard app. |
| [requirements.txt](requirements.txt) | Python dependencies. |

## Prerequisites

- Python 3.9+
- `pip` available on PATH

## One-time setup

```bash
cd /Users/ashish.r/Desktop/Release_Scorecard
pip3 install -r requirements.txt
```

If only the dashboard deps are needed:

```bash
pip3 install streamlit plotly pandas reportlab
```

> **Note (macOS):** If `pip3` warns that `streamlit` was installed to a directory not on
> PATH (e.g. `~/Library/Python/3.14/bin`), use `python3 -m streamlit ...` instead of the
> bare `streamlit` command — see commands below.

## Launching the dashboard

From the project directory:

```bash
python3 -m streamlit run publish_release_scorecard.py
```

The app opens automatically at <http://localhost:8501>. Stop it with `Ctrl+C` in the
terminal.

### Point at a different CSV

```bash
python3 -m streamlit run publish_release_scorecard.py -- --csv /path/to/release_scorecard.csv
```

The `--` separator is required so Streamlit forwards the flag to the app.

You can also use the **"Upload a different scorecard CSV"** uploader in the sidebar to
swap data without restarting.

### Run headless (no browser auto-open)

```bash
python3 -m streamlit run publish_release_scorecard.py --server.headless true --server.port 8501
```

## Dashboard layout

| Section | What it shows |
| --- | --- |
| **Overall KPIs** | Releases, avg overall / delivery / quality / CSAT scores, total customer bugs, criticals, hotfixes, prod incidents, MTTR. |
| **Score Trends** | Quality / Delivery / CSAT / Overall scores by release version. |
| **Story Delivery** | Stories delivered vs carried over, delivery % trend. |
| **Bug Breakdown** | Customer bugs stacked by severity; internal bug funnel (found / fixed / deferred / re-opened). |
| **Test & Coverage** | Test pass/fail; automation, code, regression coverage % trends. |
| **Release Health** | Hotfixes, rollbacks, production incidents per release. |
| **Retro Notes** | What went well / didn't, action items, owners, retro dates. |
| **Raw scorecard data** | Full table, expandable. |

### Sidebar filters

- **Upload a different scorecard CSV** — load any CSV in the same schema.
- **Project** — multi-select.
- **Team / Squad** — multi-select.
- **Release Version** — multi-select.

All filters compose; charts re-render automatically.

### Exporting to PDF

A **Download PDF** button is in the top-right of the page. The PDF reflects the
**currently filtered data** and contains:

1. **Summary page** — generation timestamp, source CSV, overall KPIs table,
   release snapshot (one row per release with key scores).
2. **One page per release** — sectioned detail: Release Info, Scope & Delivery,
   Internal Bugs, Customer Bugs, Test & Coverage, Release Health, Scores, Retro.

The file is named `release_scorecard_<YYYYMMDD_HHMM>.pdf`. Apply filters in the
sidebar first if you want to export a subset (e.g. one project or one release).

## Updating the data

1. Open [release_scorecard.csv](release_scorecard.csv) in any editor or spreadsheet tool.
2. Append a row per release (one row = one release).
3. Save the file. The dashboard caches data — if it's already running, click **Rerun**
   in the Streamlit menu (top-right) or press `R`.

### Regenerating the template

```bash
python3 generate_release_scorecard.py
```

This rewrites `release_scorecard.csv` (with sample data) and
`release_scorecard_blank.csv` (header only).

> **Warning:** This overwrites `release_scorecard.csv`. Back it up first if you have
> real data in there.

## CSV schema

Required columns (see [generate_release_scorecard.py](generate_release_scorecard.py) for
the authoritative list):

- **Release Info** — Release Version, Release Date, Project Name, Team / Squad
- **Sprint / Cycle** — Sprint / Cycle, Sprint Start Date, Sprint End Date
- **Scope & Delivery** — Total Stories Planned, Total Stories Delivered, Stories Carried
  Over, Delivery %
- **Bug Metrics (Internal)** — Bugs Found (Internal QA), Bugs Fixed Before Release,
  Bugs Deferred, Bugs Re-opened
- **Bug Metrics (Customer)** — Bugs Raised by Customer, Critical / High / Medium / Low
  Bugs by Customer
- **Bug Resolution** — Customer Bugs Fixed in Release, Customer Bugs Pending, Mean Time
  to Resolve (hrs)
- **Quality** — Test Cases Written / Executed / Passed / Failed, Automation Coverage %,
  Code Coverage %
- **Regression** — Regression Cycles, Regression Pass %
- **Release Health** — Hotfixes Post Release, Rollbacks, Production Incidents
- **Retro** — What Went Well, What Didn't Go Well, Action Items, Owner (Action Items),
  Retro Date
- **Scores (0–10)** — Quality, Delivery, Customer Satisfaction, Overall
- **Notes** — Comments / Notes

Percent columns may be written as `90%` or `90`; both are parsed correctly.
Date columns use `YYYY-MM-DD`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `command not found: streamlit` | Use `python3 -m streamlit run ...` |
| `ModuleNotFoundError: No module named 'streamlit'` | `pip3 install streamlit plotly pandas` |
| Port 8501 already in use | Append `--server.port 8502` (or any free port) |
| Charts not updating after CSV edit | Click **Rerun** in the Streamlit menu, or press `R` |
| Empty dashboard | Check sidebar filters — at least one Project / Team / Release must be selected |
| `CSV not found` error on launch | Pass an explicit path: `-- --csv /full/path/to/release_scorecard.csv` |

## Sharing on the network

By default Streamlit binds to localhost only. To expose it to your LAN:

```bash
python3 -m streamlit run publish_release_scorecard.py --server.address 0.0.0.0 --server.port 8501
```

Then share `http://<your-machine-ip>:8501`. Make sure your firewall allows the port.
