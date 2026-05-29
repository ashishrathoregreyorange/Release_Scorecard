import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchProject, fetchHistory, syncProject, pdfUrl, fetchConfig } from "../api.js";
import { mockProjects } from "../data/mockData.js";
import ProjectHeader from "./ProjectHeader.jsx";
import ScoreRing from "./ScoreRing.jsx";
import MetricsGrid from "./MetricsGrid.jsx";
import ScoreBreakdown from "./ScoreBreakdown.jsx";
import StageBreakdown from "./StageBreakdown.jsx";
import HistoryChart from "./HistoryChart.jsx";
import IssueCard from "./IssueCard.jsx";
import TeamLearnings from "./TeamLearnings.jsx";
import ReleasePicker from "./ReleasePicker.jsx";
import JiraLinks from "./JiraLinks.jsx";

export default function ProjectView() {
  const { id } = useParams();
  const [release, setRelease] = useState(null);
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({ jiraBaseUrl: null });
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRelease(null);
    (async () => {
      try {
        const [proj, hist, cfg] = await Promise.all([
          fetchProject(id),
          fetchHistory(id),
          fetchConfig().catch(() => ({ jiraBaseUrl: null })),
        ]);
        if (cancelled) return;
        setRelease(proj);
        setHistory(hist.history || []);
        setConfig(cfg);
      } catch (err) {
        if (cancelled) return;
        const fallback = mockProjects.find((p) => p.id === id) || mockProjects[0];
        setRelease(fallback);
        setError("API unreachable — showing mock data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const updated = await syncProject(id);
      setRelease(updated);
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    window.open(pdfUrl(id), "_blank");
  };

  if (!release) {
    return <div className="text-slate-500">Loading release…</div>;
  }

  const score = release.scorecard?.score ?? null;
  const rec = release.scorecard?.recommendation;

  return (
    <div className="space-y-6">
      <ReleasePicker history={history} currentId={release.id} />

      <ProjectHeader
        release={release}
        onSync={handleSync}
        onExport={handleExport}
        syncing={syncing}
      />

      {error && (
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="card flex flex-col items-center justify-center">
          <ScoreRing score={score} recommendation={rec} />
          {release.scorecard?.rationale && (
            <p className="mt-3 text-xs text-center text-slate-500">
              {release.scorecard.rationale}
            </p>
          )}
        </div>
        <div className="lg:col-span-2">
          <MetricsGrid release={release} />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <ScoreBreakdown scorecard={release.scorecard} />
        <StageBreakdown stages={release.stages} />
      </section>

      {history.length > 1 && <HistoryChart history={history} />}

      {release.jiraIds?.length > 0 && (
        <JiraLinks ids={release.jiraIds} jiraBaseUrl={config.jiraBaseUrl} />
      )}

      <section>
        <h3 className="font-semibold text-slate-800 mb-3">RCA &amp; CAPA</h3>
        {release.issues?.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {release.issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} jiraBaseUrl={config.jiraBaseUrl} />
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">No issues logged.</div>
        )}
      </section>

      <section>
        <h3 className="font-semibold text-slate-800 mb-3">Team Learnings</h3>
        <TeamLearnings learnings={release.teamLearnings} />
      </section>
    </div>
  );
}
