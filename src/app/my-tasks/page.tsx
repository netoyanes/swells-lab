"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTasks, useProjects } from "@/lib/queries";
import type { Member, Task } from "@/lib/types";
import { ToastProvider } from "@/components/Toast";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";

export default function MyTasksPage() {
  return (
    <ToastProvider>
      <MyTasks />
    </ToastProvider>
  );
}

function MyTasks() {
  const router = useRouter();
  const [myUserId, setMyUserId] = useState("");
  const [myRole, setMyRole] = useState("member");
  const [members, setMembers] = useState<Member[]>([]);
  const [detail, setDetail] = useState<Task | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const tasksQ = useTasks();
  const projectsQ = useProjects();

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
  }, [router]);

  const tasks = tasksQ.data || [];
  const projects = projectsQ.data || [];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const myTasks = useMemo(() =>
    tasks.filter((t) => t.assignees?.includes(myUserId)), [tasks, myUserId]);

  const sections = useMemo(() => {
    const miSemana = myTasks.filter((t) => {
      if (!t.dueDate || t.status.includes("Done")) return false;
      const d = new Date(t.dueDate + "T00:00:00");
      return d >= weekStart && d <= weekEnd;
    }).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    const urgentes = myTasks.filter((t) =>
      t.priority.includes("Urgent") && !t.status.includes("Done") &&
      (!t.dueDate || new Date(t.dueDate + "T00:00:00") < now)
    );

    const enProgreso = myTasks.filter((t) =>
      t.status.includes("In Progress") &&
      !miSemana.includes(t)
    );

    const pendientes = myTasks.filter((t) =>
      !t.status.includes("Done") && !t.status.includes("Archived") &&
      !miSemana.includes(t) && !urgentes.includes(t) && !enProgreso.includes(t)
    );

    const completadasMes = myTasks.filter((t) => {
      if (!t.status.includes("Done")) return false;
      return true; // all done tasks shown as completed this month
    });

    return { miSemana, urgentes, enProgreso, pendientes, completadasMes };
  }, [myTasks, weekStart, weekEnd]);

  const stats = {
    semana: sections.miSemana.length,
    urgentes: sections.urgentes.length,
    progreso: sections.enProgreso.length,
    completadas: sections.completadasMes.length,
  };

  if (authed === null) {
    return <div className="p-10 text-center text-muted">Cargando...</div>;
  }

  return (
    <main className="max-w-[480px] mx-auto px-3.5 pb-24">
      <header className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Mis Tareas</h1>
          <p className="text-xs text-muted">Tu vista personal</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-xs text-muted px-3 py-1.5 rounded-full bg-sand"
        >
          ← Volver
        </button>
      </header>

      {/* Stats strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 mb-5 pb-1">
        <StatChip v={stats.semana} l="Esta semana" />
        <StatChip v={stats.urgentes} l="Urgentes" urgent />
        <StatChip v={stats.progreso} l="En progreso" />
        <StatChip v={stats.completadas} l="Completadas" />
      </div>

      {myTasks.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No tienes tareas asignadas esta semana ✨
        </div>
      ) : (
        <>
          <Section title="📅 Mi semana" tasks={sections.miSemana}
            projects={projects} members={members} myUserId={myUserId}
            empty="Sin tareas con fecha esta semana" onOpenDetail={setDetail} />

          <Section title="🔴 Urgentes" tasks={sections.urgentes}
            projects={projects} members={members} myUserId={myUserId}
            empty="Sin urgentes" onOpenDetail={setDetail} />

          <Section title="⚡ En progreso" tasks={sections.enProgreso}
            projects={projects} members={members} myUserId={myUserId}
            empty="Ninguna en progreso" onOpenDetail={setDetail} />

          <Section title="📋 Pendientes" tasks={sections.pendientes}
            projects={projects} members={members} myUserId={myUserId}
            empty="Sin pendientes" onOpenDetail={setDetail} />
        </>
      )}

      {detail && (
        <TaskDetail task={detail} projects={projects} members={members}
          myUserId={myUserId} myRole={myRole} onClose={() => setDetail(null)} />
      )}
    </main>
  );
}

function StatChip({ v, l, urgent }: { v: number; l: string; urgent?: boolean }) {
  return (
    <div className={`flex-shrink-0 px-3 py-2 rounded-lg border-[0.5px] ${
      urgent && v > 0 ? "border-red-200 bg-red-50" : "border-hairline bg-surface"
    }`}>
      <div className={`text-[18px] font-medium leading-tight ${urgent && v > 0 ? "text-red-600" : "text-ink"}`}>{v}</div>
      <div className="text-[10px] text-muted">{l}</div>
    </div>
  );
}

function Section({ title, tasks, projects, members, myUserId, empty, onOpenDetail }: {
  title: string;
  tasks: Task[];
  projects: any[];
  members: any[];
  myUserId: string;
  empty: string;
  onOpenDetail: (t: Task) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-medium uppercase tracking-wide mb-2.5 px-1">
        {title} ({tasks.length})
      </h3>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} projects={projects} members={members}
          myUserId={myUserId} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}
