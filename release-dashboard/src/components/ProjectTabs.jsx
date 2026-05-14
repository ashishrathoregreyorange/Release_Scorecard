import { Link, useLocation } from "react-router-dom";

export default function ProjectTabs({ projects }) {
  const { pathname } = useLocation();
  const activeId = pathname.split("/projects/")[1] || projects[0]?.id;

  return (
    <div className="border-b border-slate-200 mb-6 no-print">
      <nav className="-mb-px flex gap-2 overflow-x-auto">
        {projects.map((p) => {
          const isActive = p.id === activeId;
          return (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className={[
                "px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap",
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              {p.projectName}
              <span className="ml-2 text-xs text-slate-400">{p.releaseVersion}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
