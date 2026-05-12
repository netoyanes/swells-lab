"use client";

import { useState } from "react";
import type { Project, Task } from "@/lib/types";
import { PRIORITY_OPTS, STATUS_OPTS } from "@/lib/types";
import { formatDate, haptic, priorityClass, statusClass } from "@/lib/utils";
import { useUpdateTask } from "@/lib/queries";
import { Picker } from "./Picker";
import { useToast } from "./Toast";

interface Props {
  task: Task;
  projects: Project[];
  onOpenDetail?: (t: Task) => void;
}

export function TaskCard({ task, projects, onOpenDetail }: Props) {
  const [picker, setPicker] = useState<null | "status" | "priority">(null);
  const update = useUpdateTask();
  const toast = useToast();

  const projNames = task.projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(" · ");

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
      <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-3.5 mb-2.5">
        <button
          onClick={() => onOpenDetail?.(task)}
          className="text-left w-full"
        >
          <div className="text-sm font-medium leading-snug mb-1.5">
            {task.name}
          </div>
          {projNames && (
            <div className="text-[11px] text-muted mb-2.5">{projNames}</div>
          )}
        </button>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${statusClass(
              task.status
            )}`}
          >
            {task.status}
          </span>
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${priorityClass(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
          {task.dueDate && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-sand text-muted">
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
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
