// Express API + (in production) static serving of the built React app.

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";

import {
  getReleases,
  getRelease,
  getProjectsLatest,
  getProjectHistory,
  putCapa,
  getCapa,
  putReleases,
} from "./store.js";
import { scoreRelease } from "./scorecard.js";
import { fetchBugsFor, syncRelease, startPolling } from "./jira.js";
import { renderReleasePdf } from "./pdf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.DASHBOARD_PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- helpers ----------------------------------------------------- //

function withScore(release) {
  if (!release) return null;
  return { ...release, scorecard: scoreRelease(release) };
}

// ---------- API --------------------------------------------------------- //

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, releases: getReleases().length });
});

// List projects + latest release scorecard for each.
app.get("/api/projects", (_req, res) => {
  const latest = getProjectsLatest().map(withScore);
  res.json(latest);
});

// Full scorecard for a single release id.
app.get("/api/projects/:id", (req, res) => {
  const release = getRelease(req.params.id);
  if (!release) return res.status(404).json({ error: "Release not found" });
  const capa = getCapa(release.id);
  res.json({ ...withScore(release), capa });
});

// Score-trend history across releases for a project (looked up by projectName
// of the given release id, so callers can pass either an id or a slug).
app.get("/api/projects/:id/history", (req, res) => {
  const release = getRelease(req.params.id);
  const projectName = release ? release.projectName : req.params.id;
  const history = getProjectHistory(projectName).map(withScore);
  res.json({ projectName, history });
});

// Submit / update a CAPA entry for a release.
app.post("/api/projects/:id/capa", (req, res) => {
  const release = getRelease(req.params.id);
  if (!release) return res.status(404).json({ error: "Release not found" });
  const body = req.body || {};
  if (!body.capa || !String(body.capa).trim()) {
    return res.status(400).json({ error: "Field 'capa' is required" });
  }
  const entry = putCapa(release.id, {
    id: body.id,
    issueId: body.issueId || null,
    rca: body.rca || null,
    capa: String(body.capa).trim(),
    owner: body.owner || null,
    dueDate: body.dueDate || null,
    team: body.team || null,
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(entry);
});

// On-demand JIRA sync (writes back into the store).
app.post("/api/projects/:id/sync", async (req, res) => {
  const release = getRelease(req.params.id);
  if (!release) return res.status(404).json({ error: "Release not found" });
  const updated = await syncRelease(release, { forceRefresh: true });
  putReleases([updated]);
  res.json(withScore(updated));
});

// Direct JIRA fetch (for debugging / preview without writing).
app.get("/api/jira/:projectKey/:fixVersion", async (req, res) => {
  const result = await fetchBugsFor(req.params.projectKey, req.params.fixVersion);
  res.json(result);
});

// PDF export — renders /projects/:id?print=true via puppeteer.
app.get("/api/export/:id/pdf", async (req, res) => {
  const release = getRelease(req.params.id);
  if (!release) return res.status(404).json({ error: "Release not found" });
  try {
    const url = `http://localhost:${PORT}/projects/${release.id}?print=true`;
    const pdf = await renderReleasePdf(url);
    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${release.id}-scorecard.pdf"`,
    );
    res.setHeader("Content-Length", buf.length);
    res.end(buf);
  } catch (err) {
    console.error(`[pdf] failed for ${release.id}: ${err.message}`);
    res.status(500).json({ error: `PDF export failed: ${err.message}` });
  }
});

// ---------- static frontend (production) -------------------------------- //

const distDir = path.resolve(__dirname, "../dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA fallback for /projects/:id deep links.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// ---------- start ------------------------------------------------------- //

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  if (!fs.existsSync(distDir)) {
    console.log(`[api] no dist/ yet — run \`npm run build\` to serve the SPA from this server`);
  }
});

// Wire JIRA polling. The sync routine walks every stored release.
startPolling(async () => {
  const releases = getReleases();
  for (const r of releases) {
    const updated = await syncRelease(r);
    if (updated !== r) putReleases([updated]);
  }
}, Number(process.env.JIRA_POLL_INTERVAL_MS));
