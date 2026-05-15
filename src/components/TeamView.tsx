"use client";

import type { Member, Task } from "@/lib/types";

function workloadDot(count: number) {
  if (count <= 2) return "🟢";
  if (count <= 5) return "🟡";
  return "🔴";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora mismo";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

interface Props {
  members: Member[];
  tasks: Task[];
  myUserId: string;
  onFilterByMember: (userId: string | null) => void;
  memberFilter: string | null;
}

export function TeamView({ members, tasks, myUserId: _myUserId, onFilterByMember, memberFilter }: Props) {
  if (!members.length) {
    return <div className="text-center py-12 text-muted text-sm">Sin miembros del equipo</div>;
  }

  return (
    <div>
      {memberFilter && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[12px] text-muted">
            Viendo tareas de{" "}
            <span className="font-medium text-ink">
              {members.find((m) => m.user_id === memberFilter)?.name}
            </span>
          </span>
          <button
            onClick={() => onFilterByMember(null)}
            className="text-[11px] text-muted px-2 py-1 bg-sand rounded-full"
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {members.map((member) => {
          const myTasks = tasks.filter((t) =>
            t.assignees?.includes(member.user_id) &&
            !t.status.includes("Done") && !t.status.includes("Archived")
          );
          const activeTasks = myTasks.filter((t) =>
            t.status.includes("In Progress") || t.status.includes("Ready")
          );
          const isFiltered = memberFilter === member.user_id;

          return (
            <button
              key={member.user_id}
              onClick={() => onFilterByMember(isFiltered ? null : member.user_id)}
              className={`w-full text-left p-3.5 rounded-lg border-[0.5px] transition ${
                isFiltered ? "border-ink bg-ink/5" : "border-hairline bg-surface"
              }`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sand flex items-center justify-center text-[12px] font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate">{member.name}</span>
                    <span className="text-[10px] text-muted capitalize px-1.5 py-0.5 bg-sand rounded-full">
                      {member.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {workloadDot(myTasks.length)} {myTasks.length} tarea{myTasks.length !== 1 ? "s" : ""} activa{myTasks.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {activeTasks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activeTasks.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className="text-[10px] px-2 py-0.5 bg-sand rounded-full text-muted truncate max-w-[120px]"
                    >
                      {t.name}
                    </span>
                  ))}
                  {activeTasks.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 bg-sand rounded-full text-muted">
                      +{activeTasks.length - 4} más
                    </span>
                  )}
                </div>
              )}

              {myTasks.length === 0 && (
                <div className="text-[11px] text-muted">Sin tareas asignadas</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
