"use client";

import { useState } from "react";
import type { Project, Task } from "@/lib/types";
import { PRIORITY_OPTS, STATUS_OPTS } from "@/lib/types";
import { formatDate, haptic, priorityClass, statusClass } from "@/lib/utils";
import { useUpdateTask } from "@/lib/queries";
import { Picker } from "./Picker";
import { useToast } from "./Toast";

interface Member {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  task: Task;
  projects: Project[];
  members?: Member[];
  myUserId?: string;
  onOpenDetail?: (t: Task) => void;
}

export function TaskCard({ task, projects, members = [], myUserId, onOpenDetail }: Props) {
  const [picker, setPicker] = useState<null | "status" | "priority">(null);
  const update = useUpdateTask();
  const toast = useToast();

  const projNames = task.projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(" · ");

  const assignedMembers = (task.assignees || [])
    .map((uid: string) => members.find((m) => m.user_id === uid))
    .filter(Boolean) as Member[];

  const isAssignedToMe = myUserId && task.assignees?.includes(myUserId);

  const handle = (field: "status" | "priority", value: string) => {
    haptic();
    update.mutate(
      { taskId: task.id, fields: { [field]: value as never } },
      {
        onSuccess: () => toast("✓ Guardado"),
        onError: () => toast("⚠ Error al guardar"),
      }
    );
    setPicker(null);
  };

  return (
    <>
      <div className={`bg-surface border-[0.5px] rounded-lg p-3.5 mb-2.5 ${isAssignedToMe ? "border-ink/20" : "border-hairline"}`}>
        <button onClick={() => onOpenDetail?.(task)} className="text-left w-full">
          <div className="text-sm font-medium leading-snug mb-1.5">{task.name}</div>
          {projNames && <div className="text-[11px] text-muted mb-2.5">{projNames}</div>}
        </button>

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${statusClass(task.status)}`}>
            {task.status}
          </span>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${priorityClass(task.priority)}`}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-sand text-muted">
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Assignee avatars */}
        {assignedMembers.length > 0 && (
          <div className="flex items-center gap-1 mb-2.5">
            {assignedMembers.map((m) => (
              <div key={m.user_id} title={m.name}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name} className="w-6 h-6 rounded-full border border-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-sand border border-white flex items-center justify-center text-[10px] font-medium">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            <span className="text-[10px] text-muted ml-1">
              {assignedMembers.map((m) => m.name.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}

        <div className="flex gap-1.5 pt-2.5 border-t-[0.5px] border-hairline">
          <button
            onClick={() => setPicker("status")}
            className="flex-1 text-xs py-2 bg-soft rounded-sm font-medium text-ink active:scale-[0.97] transition-transform"
          >
            Cambiar status
          </button>
          <button
            onClick={() => setPicker("priority")}
            className="flex-1 text-xs py-2 bg-soft rounded-sm font-medium text-ink active:scale-[0.97] transition-transform"
          >
            Prioridad
          </button>
        </div>
      </div>

      {picker === "status" && (
        <Picker
          title="Cambiar status"
          options={STATUS_OPTS as unknown as string[]}
          current={task.status}
          onSelect={(v) => handle("status", v)}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "priority" && (
        <Picker
          title="Cambiar prioridad"
          options={PRIORITY_OPTS as unknown as string[]}
          current={task.priority}
          onSelect={(v) => handle("priority", v)}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
