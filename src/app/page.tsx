"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProjects, useTasks } from "@/lib/queries";
import type { Member, Task } from "@/lib/types";
import { isOpen, sortByPriority } from "@/lib/utils";
import { ToastProvider } from "@/components/Toast";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { ProjectCard } from "@/components/ProjectCard";
import { NotificationBell } from "@/components/NotificationBell";
import { CreateTaskSheet } from "@/components/CreateTaskSheet";
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
  const [showCreate, setShowCreate] = useState(false);
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
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/members-get`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
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
    urgent: tasks.filter((t) => t.priority.includes("Urgent")).length,
    progress: tasks.filter((t) => t.status.includes("Progress")).length,
    done: tasks.filter((t) => t.status.includes("Done")).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (memberFilter) {
      list = list.filter((t) => t.assignees?.includes(memberFilter));
    } else if (filter === "all") {
      list = tasks.filter(isOpen);
    } else if (filter === "mine") {
      list = tasks.filter((t) => isOpen(t) && t.assignees?.includes(myUserId));
    } else if (filter === "urgent") {
      list = tasks.filter((t) => t.priority.includes("Urgent"));
    } else if (filter === "progress") {
      list = tasks.filter((t) => t.status.includes("Progress"));
    } else if (filter === "ready") {
      list = tasks.filter((t) => t.status.includes("Ready"));
    } else if (filter === "planning") {
      list = tasks.filter((t) => t.status.includes("Planning"));
    } else if (filter === "blocked") {
      list = tasks.filter((t) => t.status.includes("Blocked"));
    } else if (filter === "done") {
      list = tasks.filter((t) => t.status.includes("Done"));
    }
    return sortByPriority(list);
  }, [tasks, filter, myUserId, memberFilter]);

  useEffect(() => {
    if (!detail) return;
    const fresh = tasks.find((t) => t.id === detail.id);
    if (fresh) setDetail(fresh);
  }, [tasks, detail]);

  // When team tab member filter is active, show tasks tab
  const handleFilterByMember = (uid: string | null) => {
    setMemberFilter(uid);
    if (uid) setTab("tasks");
  };

  const handleOpenTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) setDetail(task);
  };

  if (authed === null) return <div className="p-10 text-center text-muted">Cargando...</div>;

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
    <main className="max-w-[480px] mx-auto px-3.5 pb-28">
      {/* Header */}
      <header className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">SWELLS LAB</h1>
          <p className="text-xs text-muted">Mando de control</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell onOpenTask={handleOpenTask} />
          {["owner", "admin"].includes(myRole) && (
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-muted px-3 py-1.5 rounded-full bg-sand"
            >
              ⚙️
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-muted px-3 py-1.5 rounded-full bg-sand"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-sand rounded-md p-1 gap-0.5 mb-4">
        {(["tasks", "projects", "week", "team"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t !== "tasks") setMemberFilter(null); }}
            className={`flex-1 py-2 text-[12px] font-medium rounded-sm transition ${
              tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {tab === "tasks" && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat v={stats.open} l="Abiertas" />
            <Stat v={stats.urgent} l="Urgente" />
            <Stat v={stats.progress} l="En curso" />
            <Stat v={stats.done} l="Hechas" />
          </div>

          {memberFilter ? (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-muted">
                Viendo: <span className="font-medium text-ink">
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
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 mb-3 pb-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border-[0.5px] ${
                    filter === f.id ? "bg-ink text-white border-ink" : "bg-surface text-muted border-black/10"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {tasksQ.isLoading ? <Loading /> :
           tasksQ.isError ? <ErrorState msg={(tasksQ.error as Error).message} /> :
           filtered.length === 0 ? (
             <Empty msg={filter === "mine" && !memberFilter
               ? "No tienes tareas asignadas ✨"
               : "Sin tareas en este filtro"} />
           ) :
           filtered.map((t) => (
             <TaskCard key={t.id} task={t} projects={projects} members={members}
               myUserId={myUserId} onOpenDetail={setDetail} />
           ))}
        </>
      )}

      {/* PROJECTS TAB */}
      {tab === "projects" && (
        <>
          {projectsQ.isLoading ? <Loading /> :
           [...projects].sort((a: any, b: any) => {
             if (a.status === "Active" && b.status !== "Active") return -1;
             if (a.status !== "Active" && b.status === "Active") return 1;
             return tasks.filter((t) => t.projectIds.includes(b.id)).length -
                    tasks.filter((t) => t.projectIds.includes(a.id)).length;
           }).map((p) => <ProjectCard key={p.id} project={p} tasks={tasks} />)}
        </>
      )}

      {/* WEEK TAB */}
      {tab === "week" && (
        <WeekView tasks={tasks} projects={projects} members={members}
          myUserId={myUserId} onOpenDetail={setDetail} />
      )}

      {/* TEAM TAB */}
      {tab === "team" && (
        <TeamView
          members={members}
          tasks={tasks}
          myUserId={myUserId}
          onFilterByMember={handleFilterByMember}
          memberFilter={memberFilter}
        />
      )}

      {/* FAB: Create task */}
      {["owner", "admin", "member"].includes(myRole) && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-20 right-5 w-12 h-12 rounded-full bg-ink text-white text-2xl shadow-lg z-40 flex items-center justify-center active:scale-95 transition"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          title="Nueva tarea"
        >
          +
        </button>
      )}

      {/* Refresh FAB */}
      <button
        onClick={() => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["projects"] });
        }}
        className={`fixed bottom-5 right-5 w-12 h-12 rounded-full bg-surface border-[0.5px] border-hairline text-ink text-xl shadow-md z-40 flex items-center justify-center active:scale-95 transition ${
          tasksQ.isFetching || projectsQ.isFetching ? "spinning" : ""
        }`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        ⟳
      </button>

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

      {showCreate && (
        <CreateTaskSheet
          projects={projects}
          members={members}
          myUserId={myUserId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </main>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="bg-surface border-[0.5px] border-hairline rounded-md p-2.5 text-center">
      <div className="text-lg font-medium leading-tight">{v}</div>
      <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wide">{l}</div>
    </div>
  );
}

function Loading() {
  return <div className="text-center py-10 text-muted text-sm">Cargando...</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-8 text-muted text-sm">{msg}</div>;
}
function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="text-center py-8 text-pUrgent-fg text-sm px-4">
      <div className="mb-1 font-medium">⚠ Error</div>
      <div className="text-xs opacity-80 break-words">{msg}</div>
    </div>
  );
}

function WeekView({ tasks, projects, members, myUserId, onOpenDetail }: {
  tasks: Task[];
  projects: any[];
  members: any[];
  myUserId: string;
  onOpenDetail: (t: Task) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);

  const overdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate + "T00:00:00") < today && !t.status.includes("Done");
  });
  const week = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate + "T00:00:00");
    return d >= today && d <= in7 && !t.status.includes("Done");
  });
  const urgent = tasks.filter((t) =>
    t.priority.includes("Urgent") && !t.status.includes("Done") &&
    !overdue.includes(t) && !week.includes(t)
  );

  if (!overdue.length && !week.length && !urgent.length) {
    return <div className="text-center py-12 text-muted text-sm">Nada urgente esta semana ✨</div>;
  }

  return (
    <>
      {overdue.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium text-pUrgent-fg uppercase tracking-wide mt-2 mb-2.5 px-1">
            ⚠️ Vencidas ({overdue.length})
          </h3>
          {overdue.map((t) => <TaskCard key={t.id} task={t} projects={projects}
            members={members} myUserId={myUserId} onOpenDetail={onOpenDetail} />)}
        </>
      )}
      {week.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium uppercase tracking-wide mt-5 mb-2.5 px-1">
            📅 Próximos 7 días ({week.length})
          </h3>
          {[...week].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
            .map((t) => <TaskCard key={t.id} task={t} projects={projects}
              members={members} myUserId={myUserId} onOpenDetail={onOpenDetail} />)}
        </>
      )}
      {urgent.length > 0 && (
        <>
          <h3 className="text-[13px] font-medium text-pUrgent-fg uppercase tracking-wide mt-5 mb-2.5 px-1">
            🔴 Urgentes sin fecha ({urgent.length})
          </h3>
          {urgent.map((t) => <TaskCard key={t.id} task={t} projects={projects}
            members={members} myUserId={myUserId} onOpenDetail={onOpenDetail} />)}
        </>
      )}
    </>
  );
}
