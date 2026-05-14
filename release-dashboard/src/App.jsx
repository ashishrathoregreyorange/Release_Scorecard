import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { fetchProjects } from "./api.js";
import { mockProjects } from "./data/mockData.js";
import ProjectTabs from "./components/ProjectTabs.jsx";
import ProjectView from "./components/ProjectView.jsx";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProjects();
        setProjects(data.length ? data : mockProjects);
      } catch (err) {
        console.error(err);
        setError("Failed to reach API — showing mock data.");
        setProjects(mockProjects);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const releaseManager = projects[0]?.owner || "—";
  const publishDate = new Date().toLocaleDateString();

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">GreyOrange Release Scorecard</h1>
            <p className="text-xs text-slate-500">
              Published {publishDate} · Release Manager: {releaseManager}
            </p>
          </div>
          {error && (
            <span className="pill-conditional" title={error}>
              offline mode
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ProjectTabs projects={projects} />
            <Routes>
              <Route
                path="/"
                element={<Navigate to={`/projects/${projects[0].id}`} replace />}
              />
              <Route path="/projects/:id" element={<ProjectView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <p className="text-slate-600 mb-2">No releases ingested yet.</p>
      <p className="text-sm text-slate-500">
        Drop CSV files into <code>/data</code> and run{" "}
        <code className="bg-slate-100 px-1 rounded">npm run ingest</code>.
      </p>
    </div>
  );
}
