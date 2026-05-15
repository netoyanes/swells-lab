"use client";

import type { Member, Task } from "@/lib/types";

function workloadInfo(count: number): { dot: string; color: string } {
  if (count <= 2) return { dot: "🟢", color: "text-sDone-fg" };
  if (count <= 5) return { dot: "🟡", color: "text-sPlanning-fg" };
  return { dot: "🔴", color: "text-sBlocked-fg" };
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
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-3">👥</div>
        <div className="text-[14px] text-muted">Invita a tu equipo</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-3 px-1">
        Equipo · {members.length} miembros
      </div>

      {memberFilter && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[12px] text-muted">
            Viendo tareas de{" "}
            <span className="font-medium text-ink">
              {members.find((m) => m.user_id === memberFilter)?.name?.split(" ")[0]}
            </span>
          </span>
          <button
            onClick={() => onFilterByMember(null)}
            className="text-[11px] text-muted px-2.5 py-1 bg-sand rounded-full"
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      <div className="space-y-2">
        {members.map((member) => {
          const myTasks = tasks.filter((t) =>
            t.assignees?.includes(member.user_id) &&
            !t.status.includes("Done") && !t.status.includes("Archived")
          );
          const activeTasks = myTasks.filter((t) =>
            t.status.includes("In Progress") || t.status.includes("Ready")
          );
          const { dot, color } = workloadInfo(myTasks.length);
          const isFiltered = memberFilter === member.user_id;

          return (
            <button
              key={member.user_id}
              onClick={() => onFilterByMember(isFiltered ? null : member.user_id)}
              className={`w-full text-left p-4 rounded-xl border-[0.5px] transition-all active:scale-[0.98] ${
                isFiltered ? "border-ink/20 bg-ink/5" : "border-hairline bg-surface"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt={member.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sand flex items-center justify-center text-[13px] font-medium flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate">{member.name}</div>
                  <div className="text-[11px] text-muted truncate">{member.email}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted capitalize px-2 py-0.5 bg-sand rounded-full">
                    {member.role}
                  </span>
                  <span className={`text-[11px] font-medium ${color}`}>
                    {dot} {myTasks.length} tarea{myTasks.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {activeTasks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {activeTasks.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      className="text-[10px] px-2 py-0.5 bg-sand rounded-full text-muted truncate max-w-[140px]"
                    >
                      {t.name}
                    </span>
                  ))}
                  {activeTasks.length > 2 && (
                    <span className="text-[10px] px-2 py-0.5 bg-sand rounded-full text-muted">
                      +{activeTasks.length - 2} más
                    </span>
                  )}
                </div>
              )}

              {myTasks.length === 0 && (
                <div className="text-[11px] text-muted mt-1">Sin tareas activas</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
