"use client";

import type { Project, Task } from "@/lib/types";

interface Props {
  project: Project;
  tasks: Task[];
}

export function ProjectCard({ project, tasks }: Props) {
  const projTasks = tasks.filter((t) => t.projectIds.includes(project.id));
  const total = projTasks.length;

  const counts = {
    planning: projTasks.filter(
      (t) => t.status.includes("Planning") || t.status.includes("Inbox")
    ).length,
    ready: projTasks.filter((t) => t.status.includes("Ready")).length,
    progress: projTasks.filter((t) => t.status.includes("Progress")).length,
    blocked: projTasks.filter((t) => t.status.includes("Blocked")).length,
    review: projTasks.filter((t) => t.status.includes("Review")).length,
    done: projTasks.filter((t) => t.status.includes("Done")).length,
  };

  const seg = (n: number, color: string) =>
    n > 0 ? (
      <div
        key={color}
        style={{ width: `${(n / total) * 100}%`, background: color }}
        className="h-full"
      />
    ) : null;

  const desc = (project.description || "").substring(0, 90);

  return (
    <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-4 mb-2.5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="text-[15px] font-medium">{project.name}</h3>
        {project.type && (
          <span className="text-[10px] text-muted uppercase tracking-wide shrink-0">
            {project.type}
          </span>
        )}
      </div>
      {desc && (
        <p className="text-xs text-muted mb-3">
          {desc}
          {(project.description || "").length > 90 ? "…" : ""}
        </p>
      )}
      {total > 0 ? (
        <>
          <div className="flex h-2 bg-sand rounded-full overflow-hidden mb-2">
            {seg(counts.planning, "#f5d56b")}
            {seg(counts.ready, "#7cc7e0")}
            {seg(counts.progress, "#5a8de0")}
            {seg(counts.blocked, "#e26b6b")}
            {seg(counts.review, "#a37ce0")}
            {seg(counts.done, "#7cc78a")}
          </div>
          <div className="flex flex-wrap gap-2.5 text-[11px] text-muted">
            {counts.planning > 0 && (
              <span>
                <Dot c="#f5d56b" /> {counts.planning} Planning
              </span>
            )}
            {counts.ready > 0 && (
              <span>
                <Dot c="#7cc7e0" /> {counts.ready} Ready
              </span>
            )}
            {counts.progress > 0 && (
              <span>
                <Dot c="#5a8de0" /> {counts.progress} En curso
              </span>
            )}
            {counts.blocked > 0 && (
              <span>
                <Dot c="#e26b6b" /> {counts.blocked} Blocked
              </span>
            )}
            {counts.review > 0 && (
              <span>
                <Dot c="#a37ce0" /> {counts.review} Review
              </span>
            )}
            {counts.done > 0 && (
              <span>
                <Dot c="#7cc78a" /> {counts.done} Done
              </span>
            )}
            <span className="ml-auto font-medium text-ink/60">
              {total} total
            </span>
          </div>
        </>
      ) : (
        <div className="text-[11px] text-muted">Sin tareas aún</div>
      )}
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
      style={{ background: c }}
    />
  );
}
