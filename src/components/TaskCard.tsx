"use client";

import { useState } from "react";
import type { Member, Project, Task } from "@/lib/types";
import { PRIORITY_OPTS, STATUS_OPTS } from "@/lib/types";
import { formatDate, haptic, priorityClass, statusClass } from "@/lib/utils";
import { useUpdateTask } from "@/lib/queries";
import { Picker } from "./Picker";
import { useToast } from "./Toast";

interface Props {
  task: Task;
  projects: Project[];
  members?: Member[];
  myUserId?: string;
  onOpenDetail?: (t: Task) => void;
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-3.5 mb-2.5 skeleton">
      <div className="h-4 bg-sand rounded w-3/4 mb-2" />
      <div className="h-3 bg-sand rounded w-1/3 mb-3" />
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-20 bg-sand rounded-full" />
        <div className="h-5 w-16 bg-sand rounded-full" />
      </div>
      <div className="h-8 bg-sand rounded-md" />
    </div>
  );
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
    .map((uid) => members.find((m) => m.user_id === uid))
    .filter(Boolean) as Member[];

  const isAssignedToMe = !!(myUserId && task.assignees?.includes(myUserId));
  const visibleAssignees = assignedMembers.slice(0, 3);
  const extraCount = assignedMembers.length - 3;

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
      <div className={`bg-surface border-[0.5px] rounded-lg p-3.5 mb-2.5 transition-colors ${
        isAssignedToMe ? "border-ink/15" : "border-hairline"
      }`}>
        {/* Tap area */}
        <button onClick={() => onOpenDetail?.(task)} className="text-left w-full">
          <div className="text-[14px] font-medium leading-snug mb-1">{task.name}</div>
          {projNames && (
            <div className="text-[11px] text-muted mb-2.5">{projNames}</div>
          )}
        </button>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-2.5">
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

        {/* Assignee avatar stack */}
        {assignedMembers.length > 0 && (
          <button onClick={() => onOpenDetail?.(task)} className="flex items-center gap-2 mb-2.5">
            <div className="flex">
              {visibleAssignees.map((m, i) => (
                <div key={m.user_id} className="relative" style={{ zIndex: 3 - i, marginLeft: i > 0 ? -8 : 0 }}>
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      className="w-6 h-6 rounded-full border-[1.5px] border-white object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-[1.5px] border-white bg-sand flex items-center justify-center text-[9px] font-medium text-muted">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {extraCount > 0 && (
                <div
                  className="w-6 h-6 rounded-full border-[1.5px] border-white bg-ink text-white flex items-center justify-center text-[9px] font-medium"
                  style={{ marginLeft: -8, zIndex: 0 }}
                >
                  +{extraCount}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted">
              {assignedMembers.slice(0, 2).map((m) => m.name.split(" ")[0]).join(", ")}
              {assignedMembers.length > 2 ? ` +${assignedMembers.length - 2}` : ""}
            </span>
          </button>
        )}

        {/* Quick actions */}
        <div className="flex gap-1.5 pt-2.5 border-t-[0.5px] border-hairline">
          <button
            onClick={() => { haptic(); setPicker("status"); }}
            className="flex-1 text-[12px] py-2 bg-soft rounded-md font-medium text-ink active:scale-[0.97] transition-transform"
          >
            Cambiar status
          </button>
          <button
            onClick={() => { haptic(); setPicker("priority"); }}
            className="flex-1 text-[12px] py-2 bg-soft rounded-md font-medium text-ink active:scale-[0.97] transition-transform"
          >
            Prioridad
          </button>
        </div>
      </div>

      {picker === "status" && (
        <Picker title="Cambiar status" options={STATUS_OPTS as unknown as string[]}
          current={task.status} onSelect={(v) => handle("status", v)} onClose={() => setPicker(null)} />
      )}
      {picker === "priority" && (
        <Picker title="Cambiar prioridad" options={PRIORITY_OPTS as unknown as string[]}
          current={task.priority} onSelect={(v) => handle("priority", v)} onClose={() => setPicker(null)} />
      )}
    </>
  );
}
