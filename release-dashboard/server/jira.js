// Lightweight JIRA bug fetcher.
//
// Pulls bugs for one project key + fix version and maps them onto the release
// record schema. If JIRA env vars are not configured, every call is a no-op
// returning an empty patch, so the rest of the system stays usable in dev.

import axios from "axios";

const env = (k) => process.env[k] || "";

function jiraEnabled() {
  return Boolean(env("JIRA_BASE_URL") && env("JIRA_EMAIL") && env("JIRA_API_TOKEN"));
}

function client() {
  return axios.create({
    baseURL: env("JIRA_BASE_URL"),
    auth: { username: env("JIRA_EMAIL"), password: env("JIRA_API_TOKEN") },
    headers: { Accept: "application/json" },
    timeout: 10000,
  });
}

// In-memory cache keyed by `${projectKey}:${fixVersion}` with 5min TTL.
const TTL_MS = Number(env("JIRA_CACHE_TTL_MS")) || 5 * 60 * 1000;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, at: Date.now() });
}

const SEVERITY_BY_PRIORITY = {
  Highest: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
  Lowest: "low",
};

// Map a JIRA issue → schema-compatible issue card.
function mapIssue(issue) {
  const f = issue.fields || {};
  const priority = f.priority?.name || "Medium";
  return {
    id: issue.key,
    title: f.summary || issue.key,
    severity: SEVERITY_BY_PRIORITY[priority] || "medium",
    rca: f.customfield_rca || null, // teams often store RCA in a custom field
    capa: f.customfield_capa || null,
    owner: f.assignee?.displayName || null,
    dueDate: f.duedate || null,
    team: f.components?.[0]?.name || null,
    status: f.status?.name || null,
    url: env("JIRA_BASE_URL") ? `${env("JIRA_BASE_URL")}/browse/${issue.key}` : null,
  };
}

export async function fetchBugsFor(projectKey, fixVersion, { forceRefresh = false } = {}) {
  if (!jiraEnabled()) {
    return { enabled: false, issues: [], summary: emptySummary() };
  }

  const cacheKey = `${projectKey}:${fixVersion || "_any_"}`;
  if (!forceRefresh) {
    const cached = cacheGet(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  // Three ways to build the query, in priority order:
  //   1. JIRA_FILTER_ID env (or release.jiraFilterId) — re-use a saved filter
  //      (e.g. the one wrapped by greyorange-work dashboard 12599 gadget 26873).
  //      We AND with fixVersion when both are present so each release stays scoped.
  //   2. JIRA_JQL env — a raw JQL template (supports {fixVersion} placeholder).
  //   3. Built JQL from projectKey + fixVersion (the default).
  const filterId = env("JIRA_FILTER_ID");
  const jqlTemplate = env("JIRA_JQL");
  let jql;
  if (filterId) {
    jql = fixVersion
      ? `filter = ${filterId} AND fixVersion = "${fixVersion}"`
      : `filter = ${filterId}`;
  } else if (jqlTemplate) {
    jql = jqlTemplate.replace("{fixVersion}", fixVersion || "").trim();
  } else {
    jql = fixVersion
      ? `project = ${projectKey} AND issuetype = Bug AND fixVersion = "${fixVersion}"`
      : `project = ${projectKey} AND issuetype = Bug`;
  }

  // Cursor-pagination across the post-2025 endpoint. Stop after 5 pages so a
  // mis-scoped JQL can't loop forever.
  const collected = [];
  let nextPageToken = undefined;
  let pages = 0;
  try {
    do {
      const { data } = await client().get("/rest/api/3/search/jql", {
        params: {
          jql,
          maxResults: 100,
          fields: "summary,priority,status,assignee,duedate,components,resolution",
          ...(nextPageToken ? { nextPageToken } : {}),
        },
      });
      for (const issue of data.issues || []) collected.push(mapIssue(issue));
      nextPageToken = data.nextPageToken;
      pages += 1;
      if (data.isLast || !nextPageToken || pages >= 5) break;
    } while (true);

    const summary = summarize(collected);
    const result = { enabled: true, issues: collected, summary, jql, pages };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    const msg = err.response
      ? `${err.response.status} ${err.response.statusText}${err.response.data ? ` — ${typeof err.response.data === "string" ? err.response.data.slice(0, 200) : JSON.stringify(err.response.data).slice(0, 200)}` : ""}`
      : err.message;
    console.error(`[jira] ${projectKey}/${fixVersion}: ${msg}`);
    return { enabled: true, error: msg, issues: [], summary: emptySummary(), jql };
  }
}

function summarize(issues) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  let open = 0;
  let resolved = 0;
  for (const i of issues) {
    counts[i.severity] = (counts[i.severity] || 0) + 1;
    if ((i.status || "").toLowerCase().includes("done")) resolved++;
    else open++;
  }
  return {
    total: issues.length,
    open,
    resolved,
    criticalOpen: counts.critical,
    severity: counts,
  };
}

function emptySummary() {
  return { total: 0, open: 0, resolved: 0, criticalOpen: 0, severity: {} };
}

// Patch a release record with the latest JIRA-derived fields.
//
// IMPORTANT: never clobber CSV-derived counts. CSV totals reflect bugs across
// all stages for *this release*; JIRA results reflect whatever the configured
// filter returns (often a global open-bugs filter scoped to a different
// release or customer). Overwriting one with the other zeroed out releases
// when the filter didn't match. We now store JIRA data alongside CSV data
// and only overwrite when JIRA actually returned matches.
export async function syncRelease(release, { forceRefresh = false } = {}) {
  if (!jiraEnabled()) return release;
  const projectKey = release.jiraProjectKey || guessProjectKey(release.projectName);
  if (!projectKey) return release;
  const result = await fetchBugsFor(projectKey, release.releaseVersion, { forceRefresh });
  if (!result.enabled || result.error) return release;

  const patch = {
    ...release,
    jiraSummary: result.summary,
    jiraIssues: result.issues,
    jiraSyncedAt: new Date().toISOString(),
    // Append JIRA issues to the display list but de-dupe by id so repeated
    // syncs don't grow the array forever.
    issues: dedupeIssues([...(release.issues || []), ...result.issues]),
  };

  // Only touch primary count fields when JIRA actually has matches AND the
  // CSV didn't already supply a value.
  if (result.summary.total > 0) {
    if (release.totalBugs == null) patch.totalBugs = result.summary.total;
    if (release.criticalBugsOpen == null) patch.criticalBugsOpen = result.summary.criticalOpen;
  }
  return patch;
}

function dedupeIssues(issues) {
  const seen = new Set();
  const out = [];
  for (const i of issues) {
    const key = i.id || `${i.title}-${i.stage}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

function guessProjectKey(projectName) {
  const known = (env("JIRA_PROJECT_KEYS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const lc = (projectName || "").toLowerCase();
  return known.find((k) => lc.includes(k.toLowerCase())) || null;
}

let pollHandle = null;

// Kick off a recurring sync. Returns a stop() function.
export function startPolling(syncFn, intervalMs) {
  if (!jiraEnabled()) {
    console.log("[jira] disabled (no env vars) — skipping poll loop");
    return () => {};
  }
  const ms = Number(intervalMs) || Number(env("JIRA_POLL_INTERVAL_MS")) || 5 * 60 * 1000;
  const tick = async () => {
    try {
      await syncFn();
    } catch (err) {
      console.error(`[jira] poll tick failed: ${err.message}`);
    }
  };
  tick();
  pollHandle = setInterval(tick, ms);
  console.log(`[jira] polling every ${ms}ms`);
  return () => {
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = null;
  };
}

export const __test = { jiraEnabled, guessProjectKey };
