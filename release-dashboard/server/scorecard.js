// Weighted release score calculator.
//
//   testPassRate        → 25%
//   automationCoverage  → 20%
//   criticalBugsOpen    → 20%  (inverted: 0 bugs = full score)
//   escapedDefects      → 20%  (inverted)
//   slaAdherence        → 15%
//
// Missing inputs are skipped and the remaining weights are renormalized so a
// partially-instrumented release still gets a comparable 0–100 score.

const WEIGHTS = {
  testPassRate: 25,
  automationCoverage: 20,
  criticalBugsOpen: 20,
  escapedDefects: 20,
  slaAdherence: 15,
};

// Inverted metrics: lower is better. We cap at a "max bad value" beyond which
// the score is 0. These caps are best-effort defaults; tune per project.
const INVERTED_CAPS = {
  criticalBugsOpen: 5, // 5+ open criticals → 0
  escapedDefects: 5, // 5+ escaped defects → 0
};

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function directScore(value) {
  // value is 0–100 already (pass rate or coverage %).
  if (value == null || Number.isNaN(value)) return null;
  return clamp(value);
}

function invertedScore(value, cap) {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 0) return 100;
  if (value >= cap) return 0;
  return clamp(100 * (1 - value / cap));
}

export function scoreRelease(release) {
  const inputs = {
    testPassRate: directScore(release.testPassRate),
    automationCoverage: directScore(release.automationCoverage),
    criticalBugsOpen: invertedScore(release.criticalBugsOpen, INVERTED_CAPS.criticalBugsOpen),
    escapedDefects: invertedScore(release.escapedDefects, INVERTED_CAPS.escapedDefects),
    slaAdherence: directScore(release.slaAdherence),
  };

  let totalWeight = 0;
  let weighted = 0;
  const breakdown = {};
  for (const [key, w] of Object.entries(WEIGHTS)) {
    const v = inputs[key];
    breakdown[key] = {
      weight: w,
      value: v,
      raw: release[key] ?? null,
      contribution: v == null ? null : Math.round((v * w) / 100),
    };
    if (v != null) {
      weighted += v * w;
      totalWeight += w;
    }
  }

  const score = totalWeight === 0 ? null : Math.round(weighted / totalWeight);

  let recommendation = "unknown";
  if (score != null) {
    if (score >= 80) recommendation = "go";
    else if (score >= 60) recommendation = "conditional";
    else recommendation = "nogo";
  }

  return {
    score,
    breakdown,
    weightsApplied: totalWeight,
    recommendation,
    rationale:
      score == null
        ? "Not enough scoring inputs available."
        : `${score}/100 across ${totalWeight}% of weighted dimensions.`,
  };
}

export function scoreAll(releases) {
  return releases.map((r) => ({ ...r, scorecard: scoreRelease(r) }));
}
