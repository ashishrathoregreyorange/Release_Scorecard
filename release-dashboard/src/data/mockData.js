// Seed data for local dev when the API is not running or the store is empty.
// The App falls back to this list if /api/projects returns empty.

export const mockProjects = [
  {
    id: "dhl-figgs_v3-5-0",
    projectName: "DHL Figgs",
    releaseVersion: "v3.5.0",
    customerName: "DHL Supply Chain",
    owner: "Ashish R",
    releaseDate: "2026-04-22",
    testPassRate: 92,
    automationCoverage: 62,
    criticalBugsOpen: 1,
    totalBugs: 23,
    escapedDefects: 2,
    mttr: null,
    slaAdherence: 95,
    stages: {
      sqa: { product: 8, module: 5, saSi: 2, total: 15, capa: "Add negative test cases for inbound flow." },
      sit: { product: 3, module: 2, saSi: 1, total: 6, capa: "Expand SIT scope to cover WCS handshake." },
      production: { product: 1, module: 0, saSi: 1, total: 2, capa: "Empty-tote edge case missed pre-release." },
    },
    issues: [
      {
        id: "mock-1",
        title: "Production CAPA — 2 bugs",
        severity: "critical",
        rca: "Empty-tote handling not covered in regression suite.",
        capa: "Add empty-tote scenario to nightly regression run.",
        owner: "QA Lead",
        dueDate: "2026-05-20",
        team: "QA",
        stage: "Production",
      },
    ],
    teamLearnings: [
      { team: "Engineering", learning: "Pre-deploy config diff check missing.", owner: "Engg Lead", dueDate: "2026-05-15" },
      { team: "QA", learning: "Regression suite needs WCS handshake.", owner: "QA Lead", dueDate: "2026-05-22" },
    ],
    scorecard: {
      score: 78,
      recommendation: "conditional",
      breakdown: {
        testPassRate: { weight: 25, value: 92, contribution: 23 },
        automationCoverage: { weight: 20, value: 62, contribution: 12 },
        criticalBugsOpen: { weight: 20, value: 80, contribution: 16 },
        escapedDefects: { weight: 20, value: 60, contribution: 12 },
        slaAdherence: { weight: 15, value: 95, contribution: 14 },
      },
    },
  },
];
