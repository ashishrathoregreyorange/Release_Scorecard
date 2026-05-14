// Schema-agnostic CSV → release-record mapper.
// Handles the two known scorecard shapes in this repo (DHL Figgs + the generic
// sprint scorecard), and falls back gracefully on unknown columns.

import Papa from "papaparse";
import fs from "node:fs";
import path from "node:path";

function num(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace("%", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pct(v) {
  const n = num(v);
  return n == null ? null : n;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return null;
}

function makeId(projectName, releaseVersion, index) {
  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const base = `${slug(projectName)}_${slug(releaseVersion)}`;
  return base.replace(/^_|_$/g, "") || `release-${index}`;
}

// Convert one CSV row into the canonical release record schema described in
// the project plan. Missing fields are left as null / empty arrays.
export function rowToRelease(row, index = 0) {
  const projectName = pick(row, "Project Name") || "Untitled Project";
  const releaseVersion =
    pick(row, "Released Build Version", "Release Version") || `Release ${index + 1}`;

  // ---------- Stage bug totals (DHL schema) ----------
  const sqaTotal =
    num(row["SQA Bugs Total"]) ??
    sum(num(row["SQA Bugs - Product"]), num(row["SQA Bugs - Module"]), num(row["SQA Bugs - SA/SI"]));
  const sitTotal =
    num(row["SIT/UAT/HAT Bugs Total"]) ??
    sum(
      num(row["SIT/UAT/HAT Bugs - Product"]),
      num(row["SIT/UAT/HAT Bugs - Module"]),
      num(row["SIT/UAT/HAT Bugs - SA/SI"]),
    );
  const prodTotal =
    num(row["Production Bugs Total"]) ??
    sum(
      num(row["Production Bugs - Product"]),
      num(row["Production Bugs - Module"]),
      num(row["Production Bugs - SA/SI"]),
    );

  // Generic scorecard fallback fields.
  const internalBugs = num(row["Bugs Found (Internal QA)"]);
  const customerBugs = num(row["Bugs Raised by Customer"]);
  const criticalCustBugs = num(row["Critical Bugs by Customer"]);
  const customerPending = num(row["Customer Bugs Pending"]);

  // Test/coverage rollups.
  const tcExecuted = num(row["Test Cases Executed"]);
  const tcPassed = num(row["Test Cases Passed"]);
  const tcFailed = num(row["Test Cases Failed"]);
  const testPassRate =
    tcExecuted && tcPassed != null
      ? Math.round((tcPassed / tcExecuted) * 1000) / 10
      : null;

  const automationCoverage =
    pct(row["Automation Coverage %"]) ?? pct(row["Automation Coverage"]);

  // Compose an "issues" list from CAPA-bearing rows. Each CAPA learning gets a
  // synthetic issue card so the UI has something to render even before JIRA is
  // wired up.
  const issues = [];
  const capaSources = [
    { stage: "SQA", capa: row["SQA Bugs Learning (CAPA)"], count: sqaTotal },
    { stage: "SIT/UAT/HAT", capa: row["SIT Bugs Learning (CAPA)"], count: sitTotal },
    { stage: "Production", capa: row["Production Bugs Learning (CAPA)"], count: prodTotal },
  ];
  let issueIdx = 0;
  for (const { stage, capa, count } of capaSources) {
    if (!capa || !String(capa).trim()) continue;
    issues.push({
      id: `${makeId(projectName, releaseVersion, index)}_issue_${issueIdx++}`,
      title: `${stage} CAPA — ${count ?? "?"} bugs`,
      severity: stage === "Production" ? "critical" : stage === "SIT/UAT/HAT" ? "high" : "medium",
      rca: null,
      capa: String(capa).trim(),
      owner: pick(row, "Owner") || null,
      dueDate: null,
      team: stage === "SQA" ? "QA" : stage === "Production" ? "Engineering" : "QA",
      stage,
    });
  }

  // Retro learnings from the legacy schema also feed into teamLearnings.
  const teamLearnings = [];
  for (const [team, col] of [
    ["QA", "What Didn't Go Well"],
    ["Engineering", "Action Items"],
  ]) {
    const v = row[col];
    if (v && String(v).trim()) {
      teamLearnings.push({
        team,
        learning: String(v).trim(),
        owner: row["Owner (Action Items)"] || row["Owner"] || null,
        dueDate: null,
      });
    }
  }

  return {
    id: makeId(projectName, releaseVersion, index),
    projectName,
    releaseVersion,
    currentBuildVersion: row["Current Build Version"] || null,
    customerName: row["Customer Name"] || null,
    owner: row["Owner"] || null,
    releaseDate: row["Released Date"] || row["Release Date"] || null,

    // Score-engine inputs (any nulls treated as missing).
    testPassRate,
    automationCoverage,
    criticalBugsOpen: criticalCustBugs ?? null,
    totalBugs: sum(sqaTotal, sitTotal, prodTotal, internalBugs, customerBugs) || null,
    escapedDefects: prodTotal ?? customerPending ?? null,
    mttr: num(row["Mean Time to Resolve (hrs)"]),
    slaAdherence: null, // not present in current CSVs

    // Stage breakdowns (preserved for UI).
    stages: {
      sqa: stageBlock(row, "SQA"),
      sit: stageBlock(row, "SIT/UAT/HAT"),
      production: stageBlock(row, "Production"),
    },

    // Legacy fields exposed so the UI can render the older schema too.
    legacy: {
      storiesPlanned: num(row["Total Stories Planned"]),
      storiesDelivered: num(row["Total Stories Delivered"]),
      storiesCarriedOver: num(row["Stories Carried Over"]),
      deliveryPct: pct(row["Delivery %"]),
      bugsFoundInternal: internalBugs,
      bugsFixedBeforeRelease: num(row["Bugs Fixed Before Release"]),
      customerBugs,
      customerBugsCritical: criticalCustBugs,
      hotfixes: num(row["Hotfixes Post Release"]),
      rollbacks: num(row["Rollbacks"]),
      prodIncidents: num(row["Production Incidents"]),
      qualityScore: num(row["Quality Score (0-10)"]) ?? num(row["Release Quality Score (0-10)"]),
      deliveryScore: num(row["Delivery Score (0-10)"]),
      csatScore: num(row["Customer Satisfaction Score (0-10)"]),
      overallScore: num(row["Overall Release Score (0-10)"]),
    },

    issues,
    teamLearnings,
    source: "csv",
  };
}

function stageBlock(row, stage) {
  const prefix =
    stage === "SQA" ? "SQA Bugs" : stage === "Production" ? "Production Bugs" : "SIT/UAT/HAT Bugs";
  const capaCol =
    stage === "SQA"
      ? "SQA Bugs Learning (CAPA)"
      : stage === "Production"
        ? "Production Bugs Learning (CAPA)"
        : "SIT Bugs Learning (CAPA)";
  return {
    product: num(row[`${prefix} - Product`]),
    module: num(row[`${prefix} - Module`]),
    saSi: num(row[`${prefix} - SA/SI`]),
    total: num(row[`${prefix} Total`]),
    capa: row[capaCol] || null,
  };
}

function sum(...vals) {
  let total = 0;
  let seen = false;
  for (const v of vals) {
    if (v == null || Number.isNaN(v)) continue;
    total += v;
    seen = true;
  }
  return seen ? total : null;
}

// Read a single CSV file → array of release records.
export function parseCsvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      console.warn(`[csvParser] ${path.basename(filePath)}: ${e.message}`);
    }
  }
  return parsed.data.map((row, i) => rowToRelease(row, i));
}

// Read every *.csv under a directory → flat array of release records.
export function parseCsvDir(dirPath) {
  const out = [];
  if (!fs.existsSync(dirPath)) return out;
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith(".csv"));
  for (const f of files) {
    out.push(...parseCsvFile(path.join(dirPath, f)));
  }
  return out;
}
