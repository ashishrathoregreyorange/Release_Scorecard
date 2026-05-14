"""
DHL Figgs release scorecard generator.

Writes:
  - dhl_figgs_scorecard.csv         (sample-filled)
  - dhl_figgs_scorecard_blank.csv   (header + one empty row)

Bug counts are categorized as Product / Module / SA-SI for each bug type
(SQA, SIT/UAT/HAT, Production). Each bug-type group also has a Total and
a Learning (CAPA) column.
"""

import csv
import os


PROJECT_NAME = "DHL Figgs"

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
    "Release Quality Score (0-10)",
]


SAMPLE_DATA = [
    [
        PROJECT_NAME,
        "DHL Supply Chain",
        "v3.4.1",
        "v3.5.0",
        "Ashish R",
        "2026-04-22",

        # SQA bugs: product / module / SA-SI / total / capa
        8, 5, 2, 15,
        "Missing negative test cases for inbound flow; add to entry criteria checklist",

        # SIT/UAT/HAT bugs
        3, 2, 1, 6,
        "Integration scenarios with WCS not fully covered; expand SIT scope to include WCS handshake",

        # Production bugs
        1, 0, 1, 2,
        "Edge-case for empty tote not seen pre-release; add to regression suite",

        # Metrics
        "62%",
        7.8,
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

        "68%",
        8.2,
    ],
]


def generate_scorecard_csv(output_path: str = "dhl_figgs_scorecard.csv") -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SCORECARD_HEADERS)
        writer.writerows(SAMPLE_DATA)

    print(f"Scorecard CSV created   : {os.path.abspath(output_path)}")
    print(f"  Columns     : {len(SCORECARD_HEADERS)}")
    print(f"  Sample rows : {len(SAMPLE_DATA)}")


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
