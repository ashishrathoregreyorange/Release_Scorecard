"""
Release Scorecard Dashboard

A schema-aware Streamlit dashboard for release scorecard CSVs.
Auto-detects available columns and renders KPIs, charts, and PDF accordingly,
so it works for the DHL Figgs scorecard, the generic sprint scorecard, or any
other CSV that follows a similar layout.

Run:
    streamlit run publish_release_scorecard.py
    streamlit run publish_release_scorecard.py -- --csv /path/to/scorecard.csv
"""

import argparse
import io
import os
import re
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


DEFAULT_CSV = Path(__file__).parent / "dhl_figgs_scorecard.csv"

# Candidate columns to coerce to types when present.
KNOWN_PERCENT_COLS = [
    "Delivery %",
    "Automation Coverage %",
    "Code Coverage %",
    "Regression Pass %",
]

KNOWN_DATE_COLS = [
    "Release Date",
    "Released Date",
    "Sprint Start Date",
    "Sprint End Date",
    "Retro Date",
]

# Columns we never want to treat as numeric even if they parse.
TEXT_LIKE_COLS = {
    "Project Name",
    "Customer Name",
    "Owner",
    "Team / Squad",
    "Sprint / Cycle",
    "Release Version",
    "Released Build Version",
    "Current Build Version",
    "What Went Well",
    "What Didn't Go Well",
    "Action Items",
    "Owner (Action Items)",
    "Comments / Notes",
    "SQA Bugs Learning (CAPA)",
    "SIT Bugs Learning (CAPA)",
    "Production Bugs Learning (CAPA)",
}

# Preferred columns to use as the x-axis label for "per release" charts.
RELEASE_LABEL_CANDIDATES = [
    "Released Build Version",
    "Release Version",
    "Current Build Version",
    "Sprint / Cycle",
]

# Bug-category breakdown spec — pattern matches new DHL schema.
# Each stage has columns "<stage> - Product", "<stage> - Module", "<stage> - SA/SI",
# plus optional "<stage> Total" and a learning column.
BUG_STAGES = [
    {
        "name": "SQA",
        "product": "SQA Bugs - Product",
        "module": "SQA Bugs - Module",
        "sa_si": "SQA Bugs - SA/SI",
        "total": "SQA Bugs Total",
        "capa": "SQA Bugs Learning (CAPA)",
    },
    {
        "name": "SIT/UAT/HAT",
        "product": "SIT/UAT/HAT Bugs - Product",
        "module": "SIT/UAT/HAT Bugs - Module",
        "sa_si": "SIT/UAT/HAT Bugs - SA/SI",
        "total": "SIT/UAT/HAT Bugs Total",
        "capa": "SIT Bugs Learning (CAPA)",
    },
    {
        "name": "Production",
        "product": "Production Bugs - Product",
        "module": "Production Bugs - Module",
        "sa_si": "Production Bugs - SA/SI",
        "total": "Production Bugs Total",
        "capa": "Production Bugs Learning (CAPA)",
    },
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=str(DEFAULT_CSV), help="Path to scorecard CSV")
    args, _ = parser.parse_known_args()
    return args


@st.cache_data
def load_data(source) -> pd.DataFrame:
    """Load and lightly normalize the scorecard CSV.

    Accepts a path or any file-like object Streamlit hands us from the uploader.
    """
    df = pd.read_csv(source)

    for col in df.columns:
        if col in TEXT_LIKE_COLS:
            continue
        # Strip "%" from percent-shaped values and coerce to numeric.
        sample = df[col].dropna().astype(str).head(20)
        if not sample.empty and sample.str.endswith("%").mean() > 0.5:
            df[col] = (
                df[col].astype(str).str.replace("%", "", regex=False).str.strip()
            )
            df[col] = pd.to_numeric(df[col], errors="coerce")
            continue
        if col in KNOWN_PERCENT_COLS:
            df[col] = (
                df[col].astype(str).str.replace("%", "", regex=False).str.strip()
            )
            df[col] = pd.to_numeric(df[col], errors="coerce")
            continue
        if col in KNOWN_DATE_COLS:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            continue
        # Try numeric coercion if it looks numeric-friendly.
        coerced = pd.to_numeric(df[col], errors="coerce")
        if coerced.notna().mean() >= 0.6 and coerced.notna().any():
            df[col] = coerced

    sort_col = next(
        (c for c in ["Released Date", "Release Date"] if c in df.columns), None
    )
    if sort_col is not None:
        df = df.sort_values(sort_col).reset_index(drop=True)

    return df


# -------- Helpers --------------------------------------------------------- #


def has_cols(df: pd.DataFrame, *cols: str) -> bool:
    return all(c in df.columns for c in cols)


def safe_mean(df: pd.DataFrame, col: str):
    if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
        return None
    return df[col].mean()


def safe_sum_int(df: pd.DataFrame, col: str):
    if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
        return None
    return int(df[col].fillna(0).sum())


def get_release_axis(df: pd.DataFrame) -> str | None:
    for c in RELEASE_LABEL_CANDIDATES:
        if c in df.columns:
            return c
    # Fallback: first text column.
    for c in df.columns:
        if not pd.api.types.is_numeric_dtype(df[c]):
            return c
    return None


def detect_score_cols(df: pd.DataFrame) -> list[str]:
    return [
        c for c in df.columns
        if "Score" in c and pd.api.types.is_numeric_dtype(df[c])
    ]


def detect_coverage_cols(df: pd.DataFrame) -> list[str]:
    return [
        c for c in df.columns
        if ("Coverage" in c or c.endswith("Pass %") or c == "Regression Pass %")
        and pd.api.types.is_numeric_dtype(df[c])
    ]


def _fmt(value, suffix: str = "") -> str:
    if value is None:
        return "—"
    if isinstance(value, float) and pd.isna(value):
        return "—"
    if isinstance(value, pd.Timestamp):
        return "—" if pd.isna(value) else value.strftime("%Y-%m-%d")
    if isinstance(value, float):
        return f"{value:.1f}{suffix}"
    return f"{value}{suffix}"


def kpi_card(label: str, value, suffix: str = "", help_text: str = ""):
    st.metric(label, _fmt(value, suffix), help=help_text)


# -------- KPI section ----------------------------------------------------- #


def render_kpis(df: pd.DataFrame):
    st.subheader("Overall KPIs")

    cards: list[tuple[str, object, str]] = [("Releases", len(df), "")]

    # Score KPIs — average of each detected score column.
    for c in detect_score_cols(df):
        suffix = " / 10" if "(0-10)" in c else ""
        label = c.replace(" Score", "").replace(" (0-10)", "")
        cards.append((f"Avg {label}", safe_mean(df, c), suffix))

    # Quality score for DHL schema (explicit handle if not caught above).
    if has_cols(df, "Release Quality Score (0-10)") and not any(
        "Release Quality" in lab for lab, _, _ in cards
    ):
        cards.append(("Avg Release Quality", safe_mean(df, "Release Quality Score (0-10)"), " / 10"))

    # Coverage KPIs.
    for c in detect_coverage_cols(df):
        cards.append((f"Avg {c}", safe_mean(df, c), "%"))

    # Bug totals — DHL schema.
    for stage in BUG_STAGES:
        if stage["total"] in df.columns:
            cards.append((f"Total {stage['name']} Bugs", safe_sum_int(df, stage["total"]), ""))

    # Old schema fallbacks.
    legacy_pairs = [
        ("Total Customer Bugs", "Bugs Raised by Customer"),
        ("Critical Customer Bugs", "Critical Bugs by Customer"),
        ("Total Hotfixes", "Hotfixes Post Release"),
        ("Prod Incidents", "Production Incidents"),
        ("Avg MTTR (hrs)", "Mean Time to Resolve (hrs)"),
        ("Avg Delivery %", "Delivery %"),
    ]
    for label, col in legacy_pairs:
        if col not in df.columns:
            continue
        val = safe_mean(df, col) if label.startswith("Avg") else safe_sum_int(df, col)
        suffix = "%" if label == "Avg Delivery %" else ""
        cards.append((label, val, suffix))

    # Render in rows of 5.
    for i in range(0, len(cards), 5):
        row = cards[i : i + 5]
        cols = st.columns(len(row))
        for col_box, (label, value, suffix) in zip(cols, row):
            with col_box:
                kpi_card(label, value, suffix)


# -------- Chart sections -------------------------------------------------- #


def render_score_trends(df: pd.DataFrame):
    score_cols = detect_score_cols(df)
    axis = get_release_axis(df)
    if not score_cols or axis is None:
        return
    st.subheader("Score Trends")
    melt = df.melt(id_vars=[axis], value_vars=score_cols, var_name="Metric", value_name="Score")
    fig = px.line(melt, x=axis, y="Score", color="Metric", markers=True, range_y=[0, 10])
    fig.update_layout(legend_title_text="", height=400)
    st.plotly_chart(fig, use_container_width=True)


def render_bug_stages(df: pd.DataFrame):
    """DHL-style bug stage funnel + category breakdown."""
    axis = get_release_axis(df)
    stages_present = [s for s in BUG_STAGES if s["total"] in df.columns]
    if axis is None or not stages_present:
        return

    st.subheader("Bug Funnel by Stage")
    c1, c2 = st.columns(2)

    with c1:
        fig = go.Figure()
        for stage in stages_present:
            fig.add_bar(name=stage["name"], x=df[axis], y=df[stage["total"]])
        fig.update_layout(
            barmode="group",
            title="Total Bugs by Stage per Release",
            height=400,
        )
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        # Stacked totals: sum across releases by stage + category.
        rows = []
        for stage in stages_present:
            for cat_key, cat_label in [("product", "Product"), ("module", "Module"), ("sa_si", "SA/SI")]:
                col = stage[cat_key]
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    rows.append({"Stage": stage["name"], "Category": cat_label, "Count": int(df[col].fillna(0).sum())})
        if rows:
            cat_df = pd.DataFrame(rows)
            fig = px.bar(
                cat_df,
                x="Stage",
                y="Count",
                color="Category",
                barmode="stack",
                title="Bug Categories Across All Releases",
                color_discrete_map={"Product": "#1f77b4", "Module": "#ff7f0e", "SA/SI": "#2ca02c"},
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)


def render_bug_categories_per_release(df: pd.DataFrame):
    axis = get_release_axis(df)
    stages_present = [s for s in BUG_STAGES if any(s[k] in df.columns for k in ("product", "module", "sa_si"))]
    if axis is None or not stages_present:
        return

    st.subheader("Bug Category Breakdown per Release")
    tabs = st.tabs([s["name"] for s in stages_present])
    for tab, stage in zip(tabs, stages_present):
        with tab:
            present_cats = []
            for cat_key, cat_label in [("product", "Product"), ("module", "Module"), ("sa_si", "SA/SI")]:
                col = stage[cat_key]
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    present_cats.append((cat_label, col))
            if not present_cats:
                st.info("No category columns for this stage.")
                continue
            fig = go.Figure()
            for cat_label, col in present_cats:
                fig.add_bar(name=cat_label, x=df[axis], y=df[col])
            fig.update_layout(
                barmode="stack",
                title=f"{stage['name']} Bugs by Category",
                height=380,
            )
            st.plotly_chart(fig, use_container_width=True)


def render_delivery(df: pd.DataFrame):
    if not has_cols(df, "Total Stories Delivered", "Stories Carried Over"):
        return
    axis = get_release_axis(df)
    if axis is None:
        return
    st.subheader("Story Delivery")
    c1, c2 = st.columns(2)
    with c1:
        fig = go.Figure()
        fig.add_bar(name="Delivered", x=df[axis], y=df["Total Stories Delivered"])
        fig.add_bar(name="Carried Over", x=df[axis], y=df["Stories Carried Over"])
        fig.update_layout(barmode="stack", title="Stories Delivered vs Carried Over", height=380)
        st.plotly_chart(fig, use_container_width=True)
    with c2:
        if "Delivery %" in df.columns:
            fig = px.line(df, x=axis, y="Delivery %", markers=True, title="Delivery % by Release", range_y=[0, 105])
            fig.update_layout(height=380)
            st.plotly_chart(fig, use_container_width=True)


def render_customer_bugs(df: pd.DataFrame):
    severity_cols = [
        "Critical Bugs by Customer",
        "High Bugs by Customer",
        "Medium Bugs by Customer",
        "Low Bugs by Customer",
    ]
    if not any(c in df.columns for c in severity_cols):
        return
    axis = get_release_axis(df)
    if axis is None:
        return
    st.subheader("Customer Bugs by Severity")
    present = [c for c in severity_cols if c in df.columns]
    melt = df.melt(id_vars=[axis], value_vars=present, var_name="Severity", value_name="Count")
    melt["Severity"] = melt["Severity"].str.replace(" Bugs by Customer", "", regex=False)
    fig = px.bar(
        melt, x=axis, y="Count", color="Severity", barmode="stack",
        color_discrete_map={
            "Critical": "#d62728", "High": "#ff7f0e", "Medium": "#ffbb78", "Low": "#2ca02c",
        },
    )
    fig.update_layout(height=380)
    st.plotly_chart(fig, use_container_width=True)


def render_coverage(df: pd.DataFrame):
    cov_cols = detect_coverage_cols(df)
    axis = get_release_axis(df)
    if axis is None or not cov_cols:
        return
    st.subheader("Coverage Trends")
    fig = go.Figure()
    for c in cov_cols:
        fig.add_trace(go.Scatter(x=df[axis], y=df[c], mode="lines+markers", name=c))
    fig.update_layout(yaxis_range=[0, 105], height=380)
    st.plotly_chart(fig, use_container_width=True)


def render_release_health(df: pd.DataFrame):
    health_cols = [c for c in ["Hotfixes Post Release", "Rollbacks", "Production Incidents"] if c in df.columns]
    axis = get_release_axis(df)
    if axis is None or not health_cols:
        return
    st.subheader("Release Health")
    melt = df.melt(id_vars=[axis], value_vars=health_cols, var_name="Event", value_name="Count")
    fig = px.bar(melt, x=axis, y="Count", color="Event", barmode="group")
    fig.update_layout(height=350)
    st.plotly_chart(fig, use_container_width=True)


def render_capa_table(df: pd.DataFrame):
    capa_cols = [s["capa"] for s in BUG_STAGES if s["capa"] in df.columns]
    if not capa_cols:
        return
    st.subheader("CAPA Learnings")
    axis = get_release_axis(df)
    keep = [c for c in [axis, "Customer Name", "Released Date"] if c and c in df.columns]
    st.dataframe(df[keep + capa_cols], use_container_width=True, hide_index=True)


def render_retro(df: pd.DataFrame):
    retro_cols = [
        "What Went Well", "What Didn't Go Well", "Action Items",
        "Owner (Action Items)", "Retro Date", "Comments / Notes",
    ]
    present = [c for c in retro_cols if c in df.columns]
    if not present:
        return
    st.subheader("Retro Notes")
    axis = get_release_axis(df)
    keep = [axis] if axis else []
    st.dataframe(df[keep + present], use_container_width=True, hide_index=True)


def render_raw(df: pd.DataFrame):
    with st.expander("Raw scorecard data"):
        st.dataframe(df, use_container_width=True, hide_index=True)


# -------- Sidebar filters ------------------------------------------------- #


def sidebar_filters(df: pd.DataFrame) -> pd.DataFrame:
    st.sidebar.header("Filters")

    uploaded = st.sidebar.file_uploader("Upload a different scorecard CSV", type=["csv"])
    if uploaded is not None:
        df = load_data(uploaded)

    candidates = ["Project Name", "Customer Name", "Team / Squad", "Owner"]
    for col in candidates:
        if col in df.columns:
            options = sorted(df[col].dropna().astype(str).unique().tolist())
            if not options:
                continue
            chosen = st.sidebar.multiselect(col, options, default=options)
            df = df[df[col].astype(str).isin(chosen)]

    axis = get_release_axis(df)
    if axis:
        options = df[axis].dropna().astype(str).unique().tolist()
        if options:
            chosen = st.sidebar.multiselect(axis, options, default=options)
            df = df[df[axis].astype(str).isin(chosen)]

    return df.reset_index(drop=True)


# -------- PDF generation -------------------------------------------------- #


def _adaptive_summary_rows(df: pd.DataFrame) -> list[list[str]]:
    rows: list[list[str]] = [["Releases", _fmt(len(df))]]
    for c in detect_score_cols(df):
        suffix = " / 10" if "(0-10)" in c else ""
        label = c.replace(" Score", "").replace(" (0-10)", "")
        rows.append([f"Avg {label}", _fmt(safe_mean(df, c), suffix)])
    for c in detect_coverage_cols(df):
        rows.append([f"Avg {c}", _fmt(safe_mean(df, c), "%")])
    for stage in BUG_STAGES:
        if stage["total"] in df.columns:
            rows.append([f"Total {stage['name']} Bugs", _fmt(safe_sum_int(df, stage["total"]))])
    legacy_pairs = [
        ("Total Customer Bugs", "Bugs Raised by Customer", False),
        ("Critical Customer Bugs", "Critical Bugs by Customer", False),
        ("Total Hotfixes", "Hotfixes Post Release", False),
        ("Production Incidents", "Production Incidents", False),
        ("Avg MTTR (hrs)", "Mean Time to Resolve (hrs)", True),
        ("Avg Delivery %", "Delivery %", True),
    ]
    for label, col, is_mean in legacy_pairs:
        if col not in df.columns:
            continue
        val = safe_mean(df, col) if is_mean else safe_sum_int(df, col)
        suffix = "%" if label == "Avg Delivery %" else ""
        rows.append([label, _fmt(val, suffix)])
    return rows


def _release_sections(row: pd.Series, columns: list[str]) -> list[tuple[str, list[list[str]]]]:
    """Group columns into sections for the per-release page."""
    used: set[str] = set()

    def take(*cols: str) -> list[list[str]]:
        out = []
        for c in cols:
            if c in columns and c not in used:
                used.add(c)
                out.append([c, _fmt(row.get(c))])
        return out

    sections: list[tuple[str, list[list[str]]]] = []

    rel_info = take(
        "Project Name", "Customer Name", "Owner",
        "Current Build Version", "Released Build Version",
        "Release Version", "Team / Squad", "Sprint / Cycle",
        "Sprint Start Date", "Sprint End Date",
        "Released Date", "Release Date",
    )
    if rel_info:
        sections.append(("Release Info", rel_info))

    delivery = take("Total Stories Planned", "Total Stories Delivered", "Stories Carried Over", "Delivery %")
    if delivery:
        sections.append(("Scope & Delivery", delivery))

    for stage in BUG_STAGES:
        stage_cols = take(stage["product"], stage["module"], stage["sa_si"], stage["total"], stage["capa"])
        if stage_cols:
            sections.append((f"{stage['name']} Bugs", stage_cols))

    internal = take("Bugs Found (Internal QA)", "Bugs Fixed Before Release", "Bugs Deferred", "Bugs Re-opened")
    if internal:
        sections.append(("Internal Bugs (Legacy)", internal))

    customer = take(
        "Bugs Raised by Customer", "Critical Bugs by Customer", "High Bugs by Customer",
        "Medium Bugs by Customer", "Low Bugs by Customer",
        "Customer Bugs Fixed in Release", "Customer Bugs Pending", "Mean Time to Resolve (hrs)",
    )
    if customer:
        sections.append(("Customer Bugs (Legacy)", customer))

    quality = take(
        "Test Cases Written", "Test Cases Executed", "Test Cases Passed", "Test Cases Failed",
        "Automation Coverage %", "Code Coverage %", "Regression Cycles", "Regression Pass %",
    )
    if quality:
        sections.append(("Test & Coverage", quality))

    health = take("Hotfixes Post Release", "Rollbacks", "Production Incidents")
    if health:
        sections.append(("Release Health", health))

    scores = take(
        "Quality Score (0-10)", "Delivery Score (0-10)",
        "Customer Satisfaction Score (0-10)", "Overall Release Score (0-10)",
        "Release Quality Score (0-10)",
    )
    if scores:
        sections.append(("Scores", scores))

    retro = take(
        "What Went Well", "What Didn't Go Well", "Action Items",
        "Owner (Action Items)", "Retro Date", "Comments / Notes",
    )
    if retro:
        sections.append(("Retro", retro))

    # Any leftover columns end up in a misc section so nothing is lost.
    leftover = [c for c in columns if c not in used]
    if leftover:
        sections.append(("Other", [[c, _fmt(row.get(c))] for c in leftover]))

    return sections


def build_pdf(df: pd.DataFrame, source_path: str = "") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title="Release Scorecard",
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=9, leading=12)
    elements: list = []

    elements.append(Paragraph("Release Scorecard", styles["Title"]))
    meta = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    if source_path:
        meta += f"<br/>Source: {source_path}"
    elements.append(Paragraph(meta, body))
    elements.append(Spacer(1, 0.4 * cm))

    elements.append(Paragraph("Overall KPIs", styles["Heading2"]))
    kpi_table = Table(
        [["Metric", "Value"]] + _adaptive_summary_rows(df),
        colWidths=[8 * cm, 8 * cm],
    )
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222831")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    elements.append(kpi_table)

    # Snapshot table — picks the most useful columns that exist.
    axis = get_release_axis(df)
    snapshot_candidates = [
        axis,
        "Customer Name",
        "Released Date",
        "Release Date",
        "Owner",
    ] + detect_score_cols(df)
    snapshot_cols = [c for c in snapshot_candidates if c and c in df.columns]
    if snapshot_cols and len(df) > 0:
        elements.append(Spacer(1, 0.4 * cm))
        elements.append(Paragraph("Release Snapshot", styles["Heading2"]))
        header = snapshot_cols
        rows = [header]
        for _, row in df.iterrows():
            rows.append([_fmt(row.get(c)) for c in snapshot_cols])
        snap = Table(rows, repeatRows=1)
        snap.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222831")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ]))
        elements.append(snap)

    for _, row in df.iterrows():
        elements.append(PageBreak())
        title_bits = [str(row.get(c)) for c in [axis, "Customer Name"] if c and c in df.columns and pd.notna(row.get(c))]
        title = " — ".join(title_bits) if title_bits else "Release"
        elements.append(Paragraph(title, styles["Heading1"]))
        for section_title, rows in _release_sections(row, list(df.columns)):
            elements.append(Spacer(1, 0.2 * cm))
            elements.append(Paragraph(section_title, styles["Heading3"]))
            wrapped = [[Paragraph(str(c), body) for c in r] for r in rows]
            tbl = Table(wrapped, colWidths=[6 * cm, 11 * cm])
            tbl.setStyle(TableStyle([
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f4f4f4")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            elements.append(tbl)

    doc.build(elements)
    return buf.getvalue()


# -------- Main ------------------------------------------------------------ #


def main():
    args = parse_args()
    csv_path = args.csv

    st.set_page_config(page_title="Release Scorecard Dashboard", layout="wide")

    header_left, header_right = st.columns([4, 1])
    with header_left:
        st.title("Release Scorecard Dashboard")
        st.caption(f"Source: {os.path.abspath(csv_path)}")

    if not os.path.exists(csv_path):
        st.error(f"CSV not found: {csv_path}")
        st.stop()

    df = load_data(csv_path)
    df = sidebar_filters(df)

    if df.empty:
        st.warning("No rows match the current filters.")
        st.stop()

    with header_right:
        st.write("")
        try:
            pdf_bytes = build_pdf(df, source_path=os.path.abspath(csv_path))
            st.download_button(
                label="Download PDF",
                data=pdf_bytes,
                file_name=f"release_scorecard_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
                mime="application/pdf",
                use_container_width=True,
            )
        except Exception as e:
            st.error(f"PDF generation failed: {e}")

    render_kpis(df)
    st.divider()
    render_score_trends(df)
    render_bug_stages(df)
    render_bug_categories_per_release(df)
    render_delivery(df)
    render_customer_bugs(df)
    render_coverage(df)
    render_release_health(df)
    st.divider()
    render_capa_table(df)
    render_retro(df)
    render_raw(df)


if __name__ == "__main__":
    main()
