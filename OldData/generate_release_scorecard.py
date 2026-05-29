import csv
import os
from datetime import datetime


SCORECARD_HEADERS = [
    # Release Info
    "Release Version",
    "Release Date",
    "Project Name",
    "Team / Squad",

    # Sprint / Cycle
    "Sprint / Cycle",
    "Sprint Start Date",
    "Sprint End Date",

    # Scope & Delivery
    "Total Stories Planned",
    "Total Stories Delivered",
    "Stories Carried Over",
    "Delivery %",

    # Bug Metrics (Internal)
    "Bugs Found (Internal QA)",
    "Bugs Fixed Before Release",
    "Bugs Deferred",
    "Bugs Re-opened",

    # Bug Metrics (Customer / External)
    "Bugs Raised by Customer",
    "Critical Bugs by Customer",
    "High Bugs by Customer",
    "Medium Bugs by Customer",
    "Low Bugs by Customer",

    # Bug Resolution
    "Customer Bugs Fixed in Release",
    "Customer Bugs Pending",
    "Mean Time to Resolve (hrs)",

    # Quality Indicators
    "Test Cases Written",
    "Test Cases Executed",
    "Test Cases Passed",
    "Test Cases Failed",
    "Automation Coverage %",
    "Code Coverage %",

    # Regression
    "Regression Cycles",
    "Regression Pass %",

    # Release Health
    "Hotfixes Post Release",
    "Rollbacks",
    "Production Incidents",

    # Retro / Feedback
    "What Went Well",
    "What Didn't Go Well",
    "Action Items",
    "Owner (Action Items)",
    "Retro Date",

    # Scorecard Score (0-10)
    "Quality Score (0-10)",
    "Delivery Score (0-10)",
    "Customer Satisfaction Score (0-10)",
    "Overall Release Score (0-10)",

    # Notes
    "Comments / Notes",
]

SAMPLE_DATA = [
    [
        "v1.0.0",
        "2026-04-01",
        "Project Alpha",
        "Team Falcon",
        "Sprint 1",
        "2026-03-18",
        "2026-04-01",
        20, 18, 2, "90%",
        5, 5, 0, 1,
        3, 1, 1, 1, 0,
        2, 1, 24,
        40, 38, 35, 3, "60%", "72%",
        1, "92%",
        0, 0, 0,
        "Good team collaboration; CI pipeline stable",
        "Scope creep in last 3 days; late bug discovery",
        "Add entry criteria for QA; daily bug triage",
        "QA Lead",
        "2026-04-02",
        8, 8, 7, 7.7,
        "First release baseline",
    ],
    [
        "v1.1.0",
        "2026-04-15",
        "Project Alpha",
        "Team Falcon",
        "Sprint 2",
        "2026-04-02",
        "2026-04-15",
        22, 20, 2, "91%",
        4, 3, 1, 0,
        5, 2, 2, 1, 0,
        4, 1, 18,
        44, 44, 40, 4, "65%", "75%",
        1, "90%",
        1, 0, 1,
        "Improved test automation; faster bug resolution",
        "1 hotfix needed; customer critical bug missed in regression",
        "Expand regression suite to cover customer flows",
        "Automation Engineer",
        "2026-04-16",
        7, 8, 6, 7.0,
        "Customer escalation on critical bug — resolved in 8 hrs",
    ],
]


def generate_scorecard_csv(output_path: str = "release_scorecard.csv") -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SCORECARD_HEADERS)
        writer.writerows(SAMPLE_DATA)

    print(f"Scorecard template created: {os.path.abspath(output_path)}")
    print(f"  Columns : {len(SCORECARD_HEADERS)}")
    print(f"  Sample rows : {len(SAMPLE_DATA)}")


def generate_blank_template(output_path: str = "release_scorecard_blank.csv") -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(SCORECARD_HEADERS)
        writer.writerow([""] * len(SCORECARD_HEADERS))

    print(f"Blank template created  : {os.path.abspath(output_path)}")


if __name__ == "__main__":
    generate_scorecard_csv()
    generate_blank_template()
