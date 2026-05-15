"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProjects, useTasks } from "@/lib/queries";
import type { Member, Task } from "@/lib/types";
import { isOpen, sortByPriority } from "@/lib/utils";
import { ToastProvider } from "@/components/Toast";
import { TaskCard, TaskCardSkeleton } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { ProjectCard } from "@/components/ProjectCard";
import { NotificationBell } from "@/components/NotificationBell";
import { NewTaskFAB } from "@/components/NewTaskFAB";
import { TeamView } from "@/components/TeamView";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "tasks" | "projects" | "week" | "team";
type Filter = "all" | "mine" | "urgent" | "progress" | "ready" | "planning" | "blocked" | "done";

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
  const [myUserId, setMyUserId] = useState<string>("");
  const [myRole, setMyRole] = useState<string>("member");
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [filter, setFilter] = useState<Filter>("all");
  const [detail, setDetail] = useState<Task | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const tasksQ = useTasks();
  const projectsQ = useProjects();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setMyUserId(session.user.id);
      setAuthed(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/members-get`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
          const me = data.members.find((m: Member) => m.user_id === session.user.id);
          if (me) setMyRole(me.role);
        }
      } catch {}
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const tasks = tasksQ.data || [];
  const projects = projectsQ.data || [];

  const stats = useMemo(() => ({
    open: tasks.filter(isOpen).length,
    urgent: tasks.filter((t) => t.priority.includes("Urgent") && isOpen(t)).length,
    progress: tasks.filter((t) => t.status.includes("Progress")).length,
    done: tasks.filter((t) => t.status.includes("Done")).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (memberFilter) {
      return sortByPriority(list.filter((t) => t.assignees?.includes(memberFilter)));
    }
    if (filter === "all") list = tasks.filter(isOpen);
    else if (filter === "mine") list = tasks.filter((t) => isOpen(t) && t.assignees?.includes(myUserId));
    else if (filter === "urgent") list = tasks.filter((t) => t.priority.includes("Urgent") && isOpen(t));
    else if (filter === "progress") list = tasks.filter((t) => t.status.includes("Progress"));
    else if (filter === "ready") list = tasks.filter((t) => t.status.includes("Ready"));
    else if (filter === "planning") list = tasks.filter((t) => t.status.includes("Planning"));
    else if (filter === "blocked") list = tasks.filter((t) => t.status.includes("Blocked"));
    else if (filter === "done") list = tasks.filter((t) => t.status.includes("Done"));
    return sortByPriority(list);
  }, [tasks, filter, myUserId, memberFilter]);

  useEffect(() => {
    if (!detail) return;
    const fresh = tasks.find((t) => t.id === detail.id);
    if (fresh) setDetail(fresh);
  }, [tasks, detail]);

  const handleOpenTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) setDetail(task);
  };

  const handleFilterByMember = (uid: string | null) => {
    setMemberFilter(uid);
    if (uid) setTab("tasks");
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-[14px]">Cargando...</div>
      </div>
    );
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "mine", label: "👤 Mías" },
    { id: "urgent", label: "🔴 Urgente" },
    { id: "progress", label: "⚡ En curso" },
    { id: "ready", label: "🚀 Ready" },
    { id: "planning", label: "🧭 Planning" },
    { id: "blocked", label: "⏸ Bloqueadas" },
    { id: "done", label: "✅ Hechas" },
  ];

  const tabLabels: Record<Tab, string> = {
    tasks: "Tareas",
    projects: "Proyectos",
    week: "Semana",
    team: "Equipo",
  };

  return (
    <main className="max-w-[480px] mx-auto px-3.5 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between pt-5 pb-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">SWELLS LAB</h1>
          <p className="text-[12px] text-muted">Mando de control</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell userId={myUserId} onOpenTask={handleOpenTask} />
          {["owner", "admin"].includes(myRole) && (
            <button
              onClick={() => router.push("/admin")}
              className="text-[12px] text-muted px-3 py-1.5 rounded-full bg-sand active:bg-soft transition-colors"
            >
              👥 Equipo
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-[12px] text-muted px-3 py-1.5 rounded-full bg-sand active:bg-soft transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex bg-sand rounded-xl p-1 gap-0.5 mb-4">
        {(["tasks", "projects", "week", "team"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t !== "tasks") setMemberFilter(null); }}
            className={`flex-1 py-2.5 text-[12px] font-medium rounded-lg transition-all ${
              tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ── TASKS ── */}
      {tab === "tasks" && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatCard v={stats.open} l="Abiertas" onClick={() => { setFilter("all"); setMemberFilter(null); }} />
            <StatCard v={stats.urgent} l="Urgente" onClick={() => { setFilter("urgent"); setMemberFilter(null); }} highlight={stats.urgent > 0} />
            <StatCard v={stats.progress} l="En curso" onClick={() => { setFilter("progress"); setMemberFilter(null); }} />
            <StatCard v={stats.done} l="Hechas" onClick={() => { setFilter("done"); setMemberFilter(null); }} />
          </div>

          {/* Filter chips or member filter banner */}
          {memberFilter ? (
            <div className="flex items-center justify-between mb-3 bg-ink/5 border-[0.5px] border-ink/10 rounded-xl px-3 py-2">
              <span className="text-[12px] text-muted">
                Viendo:{" "}
                <span className="font-medium text-ink">
                  {members.find((m) => m.user_id === memberFilter)?.name}
                </span>
              </span>
              <button
                onClick={() => setMemberFilter(null)}
                className="text-[11px] text-muted px-2 py-1 bg-sand rounded-full"
              >
                ✕ Limpiar
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 mb-3 pb-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${
                    filter === f.id
                      ? "bg-ink text-white border-ink"
                      : "bg-surface text-muted border-hairline"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Task list */}
          {tasksQ.isLoading ? (
            <>
              <TaskCardSkeleton />
              <TaskCardSkeleton />
              <TaskCardSkeleton />
            </>
          ) : tasksQ.isError ? (
            <ErrorState onRetry={() => tasksQ.refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} memberFilter={memberFilter} />
          ) : (
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                projects={projects}
                members={members}
                myUserId={myUserId}
                onOpenDetail={setDetail}
              />
            ))
          )}
        </>
      )}

      {/* ── PROJECTS ── */}
      {tab === "projects" && (
        <>
          {projectsQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface border-[0.5px] border-hairline rounded-xl p-4 h-24 skeleton" />
              ))}
            </div>
          ) : projectsQ.isError ? (
            <ErrorState onRetry={() => projectsQ.refetch()} />
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-muted">Sin proyectos</div>
          ) : (
            [...projects]
              .sort((a: any, b: any) => {
                if (a.status === "Active" && b.status !== "Active") return -1;
                if (a.status !== "Active" && b.status === "Active") return 1;
                return (
                  tasks.filter((t) => t.projectIds.includes(b.id)).length -
                  tasks.filter((t) => t.projectIds.includes(a.id)).length
                );
              })
              .map((p) => <ProjectCard key={p.id} project={p} tasks={tasks} />)
          )}
        </>
      )}

      {/* ── WEEK ── */}
      {tab === "week" && (
        <WeekView
          tasks={tasks}
          projects={projects}
          members={members}
          myUserId={myUserId}
          onOpenDetail={setDetail}
          loading={tasksQ.isLoading}
        />
      )}

      {/* ── TEAM ── */}
      {tab === "team" && (
        <TeamView
          members={members}
          tasks={tasks}
          myUserId={myUserId}
          onFilterByMember={handleFilterByMember}
          memberFilter={memberFilter}
        />
      )}

      {/* FABs */}
      <NewTaskFAB
        projects={projects}
        members={members}
        myUserId={myUserId}
        myRole={myRole}
        onRefresh={refresh}
      />

      {/* Task detail */}
      {detail && (
        <TaskDetail
          task={detail}
          projects={projects}
          members={members}
          myUserId={myUserId}
          myRole={myRole}
          onClose={() => setDetail(null)}
        />
      )}
    </main>
  );
}

function StatCard({ v, l, onClick, highlight }: { v: number; l: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-2.5 text-center border-[0.5px] transition-colors active:scale-95 ${
        highlight && v > 0
          ? "bg-pUrgent-bg border-pUrgent-fg/20 text-pUrgent-fg"
          : "bg-surface border-hairline"
      }`}
    >
      <div className={`text-[18px] font-medium leading-tight ${highlight && v > 0 ? "" : "text-ink"}`}>{v}</div>
      <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wide">{l}</div>
    </button>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-10">
      <p className="text-[13px] text-pUrgent-fg mb-3">⚠ Error cargando</p>
      <button onClick={onRetry} className="text-[12px] text-muted underline">
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ filter, memberFilter }: { filter: string; memberFilter: string | null }) {
  const msg = memberFilter
    ? "Este miembro no tiene tareas"
    : filter === "mine"
    ? "No tienes tareas asignadas ✨"
    : "Sin tareas en este filtro";
  return <div className="text-center py-10 text-[14px] text-muted">{msg}</div>;
}

function WeekView({ tasks, projects, members, myUserId, onOpenDetail, loading }: {
  tasks: Task[];
  projects: any[];
  members: any[];
  myUserId: string;
  onOpenDetail: (t: Task) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);

  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status.includes("Done")) return false;
    return new Date(t.dueDate + "T00:00:00") < today;
  });
  const week = tasks.filter((t) => {
    if (!t.dueDate || t.status.includes("Done")) return false;
    const d = new Date(t.dueDate + "T00:00:00");
    return d >= today && d <= in7;
  });
  const urgent = tasks.filter((t) =>
    t.priority.includes("Urgent") && !t.status.includes("Done") &&
    !t.dueDate
  );

  if (!overdue.length && !week.length && !urgent.length) {
    return (
      <div className="text-center py-14">
        <div className="text-3xl mb-3">✨</div>
        <div className="text-[14px] text-muted">Nada urgente esta semana</div>
      </div>
    );
  }

  return (
    <>
      {overdue.length > 0 && (
        <WeekSection
          title={`⚠️ Vencidas (${overdue.length})`}
          titleClass="text-pUrgent-fg"
          tasks={overdue}
          projects={projects}
          members={members}
          myUserId={myUserId}
          onOpenDetail={onOpenDetail}
        />
      )}
      {week.length > 0 && (
        <WeekSection
          title={`📅 Próximos 7 días (${week.length})`}
          tasks={[...week].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))}
          projects={projects}
          members={members}
          myUserId={myUserId}
          onOpenDetail={onOpenDetail}
        />
      )}
      {urgent.length > 0 && (
        <WeekSection
          title={`🔴 Urgentes sin fecha (${urgent.length})`}
          titleClass="text-pUrgent-fg"
          tasks={urgent}
          projects={projects}
          members={members}
          myUserId={myUserId}
          onOpenDetail={onOpenDetail}
        />
      )}
    </>
  );
}

function WeekSection({ title, titleClass = "", tasks, projects, members, myUserId, onOpenDetail }: {
  title: string;
  titleClass?: string;
  tasks: Task[];
  projects: any[];
  members: any[];
  myUserId: string;
  onOpenDetail: (t: Task) => void;
}) {
  return (
    <div className="mb-5">
      <h3 className={`text-[12px] font-medium uppercase tracking-wider mb-2.5 px-1 ${titleClass || "text-muted"}`}>
        {title}
      </h3>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} projects={projects} members={members}
          myUserId={myUserId} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}
