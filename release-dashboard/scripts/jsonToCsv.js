#!/usr/bin/env node
// Convert a release JSON (or array of releases) into the dashboard CSV format.
//
//   node scripts/jsonToCsv.js path/to/release.json [--out path/to/out.csv]
//   node scripts/jsonToCsv.js path/to/release.json | tee out.csv
//
// JSON shape: see release-dashboard/data/sample_release.json or
// server/jsonToCsvConverter.js for the field list. Pass an array for
// multiple releases in one file.

import fs from "node:fs";
import path from "node:path";
import { jsonToCsv } from "../server/jsonToCsvConverter.js";

function parseArgs(argv) {
  const args = { input: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else if (!args.input) args.input = a;
  }
  return args;
}

const args = parseArgs(process.argv);
if (args.help || !args.input) {
  console.log(
    "Usage: node scripts/jsonToCsv.js <input.json> [--out out.csv]\n" +
      "  If --out is omitted, the CSV is printed to stdout.",
  );
  process.exit(args.help ? 0 : 1);
}

const inputPath = path.resolve(args.input);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
} catch (err) {
  console.error(`Invalid JSON: ${err.message}`);
  process.exit(1);
}

let csv;
try {
  csv = jsonToCsv(data);
} catch (err) {
  console.error(`Conversion failed: ${err.message}`);
  process.exit(1);
}

if (args.out) {
  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, csv);
  const n = Array.isArray(data) ? data.length : 1;
  console.error(`Wrote ${n} release(s) → ${outPath}`);
} else {
  process.stdout.write(csv);
}
