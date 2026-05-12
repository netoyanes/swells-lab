"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProjects, useTasks } from "@/lib/queries";
import type { Task } from "@/lib/types";
import { isOpen, sortByPriority } from "@/lib/utils";
import { ToastProvider } from "@/components/Toast";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { ProjectCard } from "@/components/ProjectCard";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "tasks" | "projects" | "week";
type Filter =
  | "all"
  | "urgent"
  | "progress"
  | "ready"
  | "planning"
  | "blocked"
  | "done";

export default function HomePage() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

function Dashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("tasks");
  const [filter, setFilter] = useState<Filter>("all");
  const [detail, setDetail] = useState<Task | null>(null);

  const tasksQ = useTasks();
  const projectsQ = useProjects();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/login");
      else setAuthed(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const tasks = tasksQ.data || [];
  const projects = projectsQ.data || [];

  const stats = useMemo(
    () => ({
      open: tasks.filter(isOpen).length,
      urgent: tasks.filter((t) => t.priority.includes("Urgent")).length,
      progress: tasks.filter((t) => t.status.includes("Progress")).length,
      done: tasks.filter((t) => t.status.includes("Done")).length,
    }),
    [tasks]
  );

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === "all") list = tasks.filter(isOpen);
    else if (filter === "urgent")
      list = tasks.filter((t) => t.priority.includes("Urgent"));
    else if (filter === "progress")
      list = tasks.filter((t) => t.status.includes("Progress"));
    else if (filter === "ready")
      list = tasks.filter((t) => t.status.includes("Ready"));
    else if (filter === "planning")
      list = tasks.filter((t) => t.status.includes("Planning"));
    else if (filter === "blocked")
      list = tasks.filter((t) => t.status.includes("Blocked"));
    else if (filter === "done")
      list = tasks.filter((t) => t.status.includes("Done"));
    return sortByPriority(list);
  }, [tasks, filter]);

  // Sync detail when tasks refresh
  useEffect(() => {
    if (!detail) return;
    const fresh = tasks.find((t) => t.id === detail.id);
    if (fresh) setDetail(fresh);
  }, [tasks, detail]);

  if (authed === null) {
    return <div className="p-10 text-center text-muted">Cargando...</div>;
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "urgent", label: "🔴 Urgente" },
    { id: "progress", label: "⚡ En curso" },
    { id: "ready", label: "🚀 Ready" },
    { id: "planning", label: "🧭 Planning" },
    { id: "blocked", label: "⏸ Bloqueadas" },
    { id: "done", label: "✅ Hechas" },
  ];

  return (
    <main className="max-w-[480px] mx-auto px-3.5 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">SWELLS LAB</h1>
          <p className="text-xs text-muted">Mando de control</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-muted px-3 py-1.5 rounded-full bg-sand"
          aria-label="Cerrar sesión"
        >
          Salir
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-sand rounded-md p-1 gap-1 mb-4">
        {(["tasks", "projects", "week"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[13px] font-medium rounded-sm transition ${
              tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            {t === "tasks" && "Tareas"}
            {t === "projects" && "Proyectos"}
            {t === "week" && "Semana"}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {tab === "tasks" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat v={stats.open} l="Abiertas" />
            <Stat v={stats.urgent} l="Urgente" />
            <Stat v={stats.progress} l="En curso" />
            <Stat v={stats.done} l="Hechas" />
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 mb-3 pb-2">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border-[0.5px] ${
                  filter === f.id
                    ? "bg-ink text-white border-ink"
                    : "bg-surface text-muted border-black/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {tasksQ.isLoading ? (
            <Loading />
          ) : tasksQ.isError ? (
            <ErrorState msg={(tasksQ.error as Error).message} />
          ) : filtered.length === 0 ? (
            <Empty msg="Sin tareas en este filtro" />
          ) : (
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                projects={projects}
                onOpenDetail={setDetail}
              />
            ))
          )}
        </>
      )}

      {/* PROJECTS TAB */}
      {tab === "projects" && (
        <>
          {projectsQ.isLoading ? (
            <Loading />
          ) : (
            sortProjects(projects, tasks).map((p) => (
              <ProjectCard key={p.id} project={p} tasks={tasks} />
            ))
          )}
        </>
      )}

      {/* WEEK TAB */}
      {tab === "week" && (
        <WeekView tasks={tasks} projects={projects} onOpenDetail={setDetail} />
      )}

      {/* Refresh FAB */}
      <button
        onClick={() => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["projects"] });
        }}
        className={`fixed bottom-5 right-5 w-12 h-12 rounded-full bg-ink text-white text-xl shadow-lg z-50 flex items-center justify-center active:scale-95 transition ${
          tasksQ.isFetching || projectsQ.isFetching ? "spinning" : ""
        }`}
        aria-label="Recargar"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        ⟳
      </button>

      {/* Detail modal */}
      {detail && (
        <TaskDetail
          task={detail}
          projects={projects}
          onClose={() => setDetail(null)}
        />
      )}
    </main>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="bg-surface border-[0.5px] border-hairline rounded-md p-2.5 text-center">
      <div className="text-lg font-medium leading-tight">{v}</div>
      <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wide">
        {l}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="text-center py-10 text-muted text-sm">Cargando...</div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-8 text-muted text-sm">{msg}</div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="text-center py-8 text-pUrgent-fg text-sm px-4">
      <div className="mb-1 font-medium">⚠ Error</div>
      <div className="text-xs opacity-80 break-words">{msg}</div>
    </div>
  );
}

function sortProjects(projects: Task["projectIds"] extends string[] ? any[] : never, tasks: Task[]) {
  return [...projects].sort((a: any, b: any) => {
    if (a.status === "Active" && b.status !== "Active") return -1;
    if (a.status !== "Active" && b.status === "Active") return 1;
    const ac = tasks.filter((t) => t.projectIds.includes(a.id)).length;
    const bc = tasks.filter((t) => t.projectIds.includes(b.id)).length;
    return bc - ac;
  });
}

function WeekView({
  tasks,
  projects,
  onOpenDetail,
}: {
  tasks: Task[];
  projects: any[];
  onOpenDetail: (t: Task) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const overdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate + "T00:00:00");
    return d < today && !t.status.includes("Done");
  });
  const week = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate + "T00:00:00");
    return d >= today && d <= in7 && !t.status.includes("Done");
  });
  const urgent = tasks.filter(
    (t) =>
      t.priority.includes("Urgent") &&
      !t.status.includes("Done") &&
      !overdue.includes(t) &&
      !week.includes(t)
  );

  if (!overdue.length && !week.length && !urgent.length) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        Nada urgente esta semana ✨
      </div>
    );
  }

  return (
    <>
      {overdue.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium text-pUrgent-fg uppercase tracking-wide mt-2 mb-2.5 px-1">
            ⚠️ Vencidas ({overdue.length})
          </h3>
          {overdue.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              projects={projects}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </>
      )}
      {week.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium uppercase tracking-wide mt-5 mb-2.5 px-1">
            📅 Próximos 7 días ({week.length})
          </h3>
          {[...week]
            .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
            .map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                projects={projects}
                onOpenDetail={onOpenDetail}
              />
            ))}
        </>
      )}
      {urgent.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium text-pUrgent-fg uppercase tracking-wide mt-5 mb-2.5 px-1">
            🔴 Urgentes sin fecha ({urgent.length})
          </h3>
          {urgent.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              projects={projects}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </>
      )}
    </>
  );
}
