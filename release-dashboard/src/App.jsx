import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { fetchProjects } from "./api.js";
import { mockProjects } from "./data/mockData.js";
import ProjectTabs from "./components/ProjectTabs.jsx";
import ProjectView from "./components/ProjectView.jsx";
import AllReleases from "./components/AllReleases.jsx";
import NewReleaseForm from "./components/NewReleaseForm.jsx";

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
          <div className="flex items-center gap-3">
            <NavLink to="/" label="All Releases" exact />
            <NavLink to="/new" label="+ New Release" />
            {error && (
              <span className="pill-conditional" title={error}>
                offline mode
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : (
          <>
            {projects.length > 0 && <ProjectTabs projects={projects} />}
            <Routes>
              <Route path="/" element={<AllReleases />} />
              <Route path="/new" element={<NewReleaseForm />} />
              <Route path="/projects/:id" element={<ProjectView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        )}
      </main>
    </div>
  );
}

function NavLink({ to, label, exact }) {
  const { pathname } = useLocation();
  const isActive = exact ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={[
        "text-sm px-3 py-1.5 rounded-lg border",
        isActive
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

