import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRelease } from "../api.js";

// Form-driven release entry. The user fills in only what they have; only
// `project` and `version` are required. On submit we POST the JSON shape
// the backend expects, then navigate to the new release's scorecard.

const SEVERITIES = ["critical", "high", "medium", "low"];

const emptyIssue = () => ({
  jiraId: "", title: "", severity: "medium",
  rca: "", capa: "", owner: "", dueDate: "",
});

const emptyLearning = () => ({ team: "", note: "", owner: "", dueDate: "" });

export default function NewReleaseForm() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Top-level fields
  const [project, setProject] = useState("");
  const [customer, setCustomer] = useState("");
  const [version, setVersion] = useState("");
  const [owner, setOwner] = useState("");
  const [releaseDate, setReleaseDate] = useState("");

  const [testPassRate, setTestPassRate] = useState("");
  const [automationCoverage, setAutomationCoverage] = useState("");
  const [mttrHours, setMttrHours] = useState("");

  const [sqaBugs, setSqaBugs] = useState("");
  const [sitBugs, setSitBugs] = useState("");
  const [prodBugs, setProdBugs] = useState("");
  const [criticalOpen, setCriticalOpen] = useState("");

  const [jiraIdsStr, setJiraIdsStr] = useState("");

  const [issues, setIssues] = useState([emptyIssue()]);
  const [learnings, setLearnings] = useState([emptyLearning()]);

  const updateIssue = (idx, field, value) => {
    setIssues((arr) => arr.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const updateLearning = (idx, field, value) => {
    setLearnings((arr) => arr.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const numOrUndef = (s) => {
    if (s === "" || s == null) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  const buildPayload = () => {
    const payload = { project: project.trim(), version: version.trim() };
    if (customer.trim()) payload.customer = customer.trim();
    if (owner.trim()) payload.owner = owner.trim();
    if (releaseDate) payload.releaseDate = releaseDate;

    const metrics = {};
    if (numOrUndef(testPassRate) !== undefined) metrics.testPassRate = numOrUndef(testPassRate);
    if (numOrUndef(automationCoverage) !== undefined) metrics.automationCoverage = numOrUndef(automationCoverage);
    if (numOrUndef(mttrHours) !== undefined) metrics.mttrHours = numOrUndef(mttrHours);
    if (Object.keys(metrics).length) payload.metrics = metrics;

    const bugs = {};
    if (numOrUndef(sqaBugs) !== undefined) bugs.sqa = numOrUndef(sqaBugs);
    if (numOrUndef(sitBugs) !== undefined) bugs.sit = numOrUndef(sitBugs);
    if (numOrUndef(prodBugs) !== undefined) bugs.production = numOrUndef(prodBugs);
    if (numOrUndef(criticalOpen) !== undefined) bugs.criticalOpen = numOrUndef(criticalOpen);
    if (Object.keys(bugs).length) payload.bugs = bugs;

    const jiraIds = jiraIdsStr.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (jiraIds.length) payload.jiraIds = jiraIds;

    const cleanedIssues = issues
      .filter((i) => i.title.trim())
      .map((i) => ({
        jiraId: i.jiraId.trim() || undefined,
        title: i.title.trim(),
        severity: i.severity || "medium",
        rca: i.rca.trim() || undefined,
        capa: i.capa.trim() || undefined,
        owner: i.owner.trim() || undefined,
        dueDate: i.dueDate || undefined,
      }));
    if (cleanedIssues.length) payload.issues = cleanedIssues;

    const cleanedLearnings = learnings
      .filter((l) => l.team.trim() && l.note.trim())
      .map((l) => ({
        team: l.team.trim(),
        note: l.note.trim(),
        owner: l.owner.trim() || undefined,
        dueDate: l.dueDate || undefined,
      }));
    if (cleanedLearnings.length) payload.learnings = cleanedLearnings;

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!project.trim() || !version.trim()) {
      setError("Project Name and Release Version are required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createRelease(buildPayload());
      nav(`/projects/${result.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">New Release Scorecard</h2>
          <p className="text-sm text-slate-500">
            Fill what you have. Only Project Name and Release Version are required.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Generating…" : "Generate Release Scorecard"}
        </button>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {/* ---------------- Identity ---------------- */}
      <section className="card space-y-3">
        <h3 className="font-semibold text-slate-800">Release Info</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Project Name *" value={project} onChange={setProject} placeholder="DHL Figgs" />
          <Field label="Release Version *" value={version} onChange={setVersion} placeholder="v1.0.0" />
          <Field label="Customer Name" value={customer} onChange={setCustomer} placeholder="Acme Corp" />
          <Field label="Owner" value={owner} onChange={setOwner} placeholder="Ashish R" />
          <Field label="Release Date" type="date" value={releaseDate} onChange={setReleaseDate} />
        </div>
      </section>

      {/* ---------------- Metrics ---------------- */}
      <section className="card space-y-3">
        <h3 className="font-semibold text-slate-800">Score Metrics</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Test Pass Rate %" type="number" value={testPassRate} onChange={setTestPassRate} placeholder="92" />
          <Field label="Automation Coverage %" type="number" value={automationCoverage} onChange={setAutomationCoverage} placeholder="75" />
          <Field label="MTTR (hrs)" type="number" value={mttrHours} onChange={setMttrHours} placeholder="18" />
        </div>
      </section>

      {/* ---------------- Bug counts ---------------- */}
      <section className="card space-y-3">
        <h3 className="font-semibold text-slate-800">Bug Counts</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          <Field label="SQA Bugs" type="number" value={sqaBugs} onChange={setSqaBugs} placeholder="12" />
          <Field label="SIT Bugs" type="number" value={sitBugs} onChange={setSitBugs} placeholder="5" />
          <Field label="Production Bugs" type="number" value={prodBugs} onChange={setProdBugs} placeholder="2" />
          <Field label="Critical Bugs Open" type="number" value={criticalOpen} onChange={setCriticalOpen} placeholder="1" />
        </div>
      </section>

      {/* ---------------- JIRA IDs ---------------- */}
      <section className="card space-y-3">
        <h3 className="font-semibold text-slate-800">JIRA Issues</h3>
        <Field
          label="Comma-separated JIRA IDs (badges shown on the release card)"
          value={jiraIdsStr}
          onChange={setJiraIdsStr}
          placeholder="GM-1001, GM-1002, GM-1003"
        />
      </section>

      {/* ---------------- Issue cards ---------------- */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">RCA / CAPA Cards</h3>
          <button
            type="button"
            onClick={() => setIssues((arr) => [...arr, emptyIssue()])}
            className="text-sm text-sky-700 hover:underline"
          >
            + Add issue
          </button>
        </div>
        <div className="space-y-3">
          {issues.map((issue, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Issue {idx + 1}
                </span>
                {issues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIssues((arr) => arr.filter((_, i) => i !== idx))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    remove
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <Field label="JIRA ID" value={issue.jiraId} onChange={(v) => updateIssue(idx, "jiraId", v)} placeholder="GM-1001" />
                <Field label="Title" value={issue.title} onChange={(v) => updateIssue(idx, "title", v)} placeholder="Short summary" />
                <SelectField label="Severity" value={issue.severity} onChange={(v) => updateIssue(idx, "severity", v)} options={SEVERITIES} />
                <Field label="Owner" value={issue.owner} onChange={(v) => updateIssue(idx, "owner", v)} />
                <Field label="Due Date" type="date" value={issue.dueDate} onChange={(v) => updateIssue(idx, "dueDate", v)} />
              </div>
              <Field label="RCA" textarea value={issue.rca} onChange={(v) => updateIssue(idx, "rca", v)} placeholder="Root cause" />
              <Field label="CAPA" textarea value={issue.capa} onChange={(v) => updateIssue(idx, "capa", v)} placeholder="Corrective action" />
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Team learnings ---------------- */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Team Learnings</h3>
          <button
            type="button"
            onClick={() => setLearnings((arr) => [...arr, emptyLearning()])}
            className="text-sm text-sky-700 hover:underline"
          >
            + Add learning
          </button>
        </div>
        <div className="space-y-2">
          {learnings.map((l, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Learning {idx + 1}
                </span>
                {learnings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLearnings((arr) => arr.filter((_, i) => i !== idx))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    remove
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <Field label="Team" value={l.team} onChange={(v) => updateLearning(idx, "team", v)} placeholder="Engineering" />
                <Field label="Note" value={l.note} onChange={(v) => updateLearning(idx, "note", v)} placeholder="What we learned" />
                <Field label="Owner" value={l.owner} onChange={(v) => updateLearning(idx, "owner", v)} />
                <Field label="Due Date" type="date" value={l.dueDate} onChange={(v) => updateLearning(idx, "dueDate", v)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => nav("/")}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Generating…" : "Generate Release Scorecard"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
