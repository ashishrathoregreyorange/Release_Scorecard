"""
DHL Figgs release scorecard generator.

Writes:
  - dhl_figgs_scorecard.csv         (sample-filled)
  - dhl_figgs_scorecard_blank.csv   (header + one empty row)

Bug counts are categorized as Product / Module / SA-SI for each bug type
(SQA, SIT/UAT/HAT, Production). Each bug-type group also has a Total and
a Learning (CAPA) narrative column.

Two flexible-slot sections (team name / stage are *data*, not schema —
add slots by bumping the constants, rename teams/stages just by editing
the cell):

  Team Learnings : N slots × {Team, Note, Owner, Due Date}
  CAPA Actions   : N slots × {Stage, Title, Severity, RCA, Action,
                              Owner, Due Date}
"""

import csv
import os


PROJECT_NAME = "DHL Figgs"

TEAM_LEARNING_SLOTS = 5
CAPA_SLOTS = 5


def learning_headers(n_slots: int) -> list[str]:
    cols = []
    for i in range(1, n_slots + 1):
        cols += [
            f"Learning {i} Team",
            f"Learning {i} Note",
            f"Learning {i} Owner",
            f"Learning {i} Due Date",
        ]
    return cols


def capa_headers(n_slots: int) -> list[str]:
    cols = []
    for i in range(1, n_slots + 1):
        cols += [
            f"CAPA {i} Stage",
            f"CAPA {i} Title",
            f"CAPA {i} Severity",
            f"CAPA {i} RCA",
            f"CAPA {i} Action",
            f"CAPA {i} Owner",
            f"CAPA {i} Due Date",
        ]
    return cols


SCORECARD_HEADERS = [
    # Release Info
    "Project Name",
    "Customer Name",
    "Current Build Version",
    "Released Build Version",
    "Owner",
    "Released Date",

    # SQA Bugs (categorized)
    "SQA Bugs - Product",
    "SQA Bugs - Module",
    "SQA Bugs - SA/SI",
    "SQA Bugs Total",
    "SQA Bugs Learning (CAPA)",

    # SIT / UAT / HAT Bugs (categorized)
    "SIT/UAT/HAT Bugs - Product",
    "SIT/UAT/HAT Bugs - Module",
    "SIT/UAT/HAT Bugs - SA/SI",
    "SIT/UAT/HAT Bugs Total",
    "SIT Bugs Learning (CAPA)",

    # Production Bugs (categorized)
    "Production Bugs - Product",
    "Production Bugs - Module",
    "Production Bugs - SA/SI",
    "Production Bugs Total",
    "Production Bugs Learning (CAPA)",

    # Metrics
    "Automation Coverage %",
    "MTTR (hrs)",
    "Release Quality Score (0-10)",

    # Team Learnings (flexible slots)
    *learning_headers(TEAM_LEARNING_SLOTS),

    # CAPA Actions (flexible slots, richer than the per-stage narrative)
    *capa_headers(CAPA_SLOTS),
]


def _learnings(*items) -> list:
    out: list = []
    for team, note, owner, due in items:
        out += [team, note, owner, due]
    while len(out) < TEAM_LEARNING_SLOTS * 4:
        out.append("")
    return out


def _capas(*items) -> list:
    out: list = []
    for stage, title, severity, rca, action, owner, due in items:
        out += [stage, title, severity, rca, action, owner, due]
    while len(out) < CAPA_SLOTS * 7:
        out.append("")
    return out


SAMPLE_DATA = [
    [
        PROJECT_NAME,
        "DHL Supply Chain",
        "v3.4.1",
        "v3.5.0",
        "Ashish R",
        "2026-04-22",

        # SQA bugs
        8, 5, 2, 15,
        "Missing negative test cases for inbound flow; add to entry criteria checklist",

        # SIT/UAT/HAT bugs
        3, 2, 1, 6,
        "Integration scenarios with WCS not fully covered; expand SIT scope to include WCS handshake",

        # Production bugs
        1, 0, 1, 2,
        "Edge-case for empty tote not seen pre-release; add to regression suite",

        # Metrics
        "95%",
        24,
        7.8,

        # 5 team learnings
        *_learnings(
            ("Engineering", "Add pre-deploy config diff check to CI", "Engg Lead", "2026-05-15"),
            ("QA", "Expand regression suite to cover WCS handshake", "QA Lead", "2026-05-22"),
            ("Product", "Tighten UAT acceptance criteria for inbound", "Product Mgr", "2026-05-30"),
            ("Solutions", "Document customer-specific deploy handover", "Solutions Eng", "2026-06-05"),
            ("DevOps", "Provision dedicated staging cluster per customer", "DevOps Lead", "2026-06-10"),
        ),

        # 5 CAPAs
        *_capas(
            ("Production", "Empty-tote handler crash",          "critical", "Edge case missed in unit tests; tote queue allowed null payload.",       "Add empty-tote scenario to nightly regression suite.",      "QA Lead",     "2026-05-20"),
            ("Production", "Inbound throughput dropped 18%",     "high",     "Lock contention on inventory table during bulk inserts.",                "Add composite index on (warehouse_id, sku) + batched inserts.","Engg Lead",   "2026-05-25"),
            ("SIT/UAT/HAT","WCS handshake timeout under load",   "high",     "No retry on transient socket failures during peak SIT runs.",            "Implement exponential backoff with jitter for WCS calls.", "Engg Lead",   "2026-05-18"),
            ("SIT/UAT/HAT","UAT environment data drift",         "medium",   "Test fixtures hand-curated; drifted from production schema.",            "Schedule weekly UAT refresh job from prod snapshot.",      "DevOps Lead", "2026-05-30"),
            ("SQA",        "Negative-path gaps in inbound flow", "medium",   "QA entry checklist hadn't been revised since v3.0.",                     "Revamp QA entry checklist + peer review per release.",     "QA Lead",     "2026-05-15"),
        ),
    ],
    [
        PROJECT_NAME,
        "DHL eCommerce",
        "v3.5.0",
        "v3.6.0",
        "Ashish R",
        "2026-05-06",

        6, 4, 3, 13,
        "Bug triage cadence improved — keep daily standup with dev leads",

        2, 3, 1, 6,
        "UAT environment data drift caused 2 false positives; sync UAT data weekly",

        0, 1, 0, 1,
        "Module-level config typo escaped; add config-diff gate before deploy",

        "95%",
        24,
        8.2,

        *_learnings(
            ("Engineering", "Module-level config validation before deploy",   "Engg Lead",     "2026-06-10"),
            ("QA",          "Add empty-tote scenario to nightly regression",   "QA Lead",       "2026-06-12"),
            ("Product",     "Refine UAT data refresh cadence (weekly)",        "Product Mgr",   "2026-06-20"),
            ("Solutions",   "Customer training on new config workflow",        "Solutions Eng", "2026-06-25"),
            ("Architecture","Document module-boundary contracts (v3.x)",       "Architect",     "2026-07-01"),
        ),

        *_capas(
            ("Production", "Config typo broke routing in prod",   "critical", "No pre-deploy config diff; YAML key renamed silently.",                "Add config-diff gate to CI; fail build on unrecognised keys.","Engg Lead",   "2026-06-10"),
            ("Production", "Order routing miscalculation",        "high",     "Stale cache entry served after warehouse re-zoning.",                  "Add cache version stamps + invalidate-on-change hook.",     "Engg Lead",   "2026-06-15"),
            ("SIT/UAT/HAT","UAT false positives blocked release",  "high",     "Test data drift caused 2 spurious P1 reports.",                       "Weekly automated UAT data sync from prod-sanitised snapshot.","QA Lead",    "2026-06-12"),
            ("SIT/UAT/HAT","SIT pipeline flakiness",                "medium",   "Shared SIT environment contended by multiple PRs in parallel.",       "Containerise SIT per PR (ephemeral environments).",          "DevOps Lead", "2026-06-20"),
            ("SQA",        "Bug triage backlog of 18 issues",       "medium",   "No daily triage cadence after team expansion.",                       "Daily 15-min triage standup with dev leads.",                "QA Lead",     "2026-06-08"),
        ),
    ],
]


def generate_scorecard_csv(output_path: str = "dhl_figgs_scorecard.csv") -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SCORECARD_HEADERS)
        writer.writerows(SAMPLE_DATA)

    print(f"Scorecard CSV created   : {os.path.abspath(output_path)}")
    print(f"  Columns               : {len(SCORECARD_HEADERS)}")
    print(f"  Sample rows           : {len(SAMPLE_DATA)}")
    print(f"  Learning slots / row  : {TEAM_LEARNING_SLOTS}")
    print(f"  CAPA slots / row      : {CAPA_SLOTS}")


def generate_blank_template(output_path: str = "dhl_figgs_scorecard_blank.csv") -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SCORECARD_HEADERS)
        blank_row = [PROJECT_NAME] + [""] * (len(SCORECARD_HEADERS) - 1)
        writer.writerow(blank_row)

    print(f"Blank template created  : {os.path.abspath(output_path)}")


if __name__ == "__main__":
    generate_scorecard_csv()
    generate_blank_template()
