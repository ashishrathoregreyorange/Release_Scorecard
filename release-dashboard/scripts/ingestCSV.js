#!/usr/bin/env node
// One-shot CSV → store loader.
// Usage: node scripts/ingestCSV.js --dir ./data

import path from "node:path";
import { parseCsvDir } from "../server/csvParser.js";
import { putReleases, getStorePath } from "../server/store.js";

function parseArgs(argv) {
  const args = { dir: "./data" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === "--dir" || a === "-d") && argv[i + 1]) {
      args.dir = argv[++i];
    } else if (a === "-h" || a === "--help") {
      args.help = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.help) {
  console.log(
    "Usage: node scripts/ingestCSV.js --dir <csv-folder>\n" +
      "  --dir, -d   Folder to scan for *.csv (default: ./data)",
  );
  process.exit(0);
}

const dir = path.resolve(args.dir);
console.log(`[ingest] reading CSVs from: ${dir}`);
const records = parseCsvDir(dir);
console.log(`[ingest] parsed ${records.length} release record(s)`);

if (!records.length) {
  console.warn(`[ingest] no CSV rows found — nothing written.`);
  process.exit(0);
}

const count = putReleases(records);
console.log(`[ingest] store now has ${count} release(s) at ${getStorePath()}`);
