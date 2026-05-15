"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";
import { useAssignTask } from "@/lib/queries";
import { useToast } from "./Toast";
import { haptic } from "@/lib/utils";

interface Props {
  taskId: string;
  taskName: string;
  members: Member[];
  currentAssignees: string[];
  myRole: string;
  onClose: () => void;
  onSaved: (userIds: string[], names: string) => void;
}

export function AssigneePicker({ taskId, taskName, members, currentAssignees, myRole, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentAssignees));
  const assignTask = useAssignTask();
  const toast = useToast();
  const canEdit = ["owner", "admin"].includes(myRole);

  const toggle = (uid: string) => {
    if (!canEdit) return;
    haptic();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const save = async () => {
    try {
      const result = await assignTask.mutateAsync({
        task_id: taskId,
        user_ids: [...selected],
        task_name: taskName,
      });
      toast("✓ Asignación guardada");
      onSaved([...selected], result.assigneeNames);
      onClose();
    } catch {
      toast("⚠ Error al guardar");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[150] flex items-end"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] p-5 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4" />
        <h3 className="text-[15px] font-medium mb-4">
          {canEdit ? "Asignar tarea" : "Asignados"}
        </h3>

        <div className="space-y-1 mb-5">
          {members.map((m) => {
            const isSelected = selected.has(m.user_id);
            return (
              <button
                key={m.user_id}
                onClick={() => toggle(m.user_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-[0.5px] transition text-left ${
                  isSelected ? "border-ink bg-ink/5" : "border-hairline bg-surface"
                } ${!canEdit ? "cursor-default" : ""}`}
              >
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center text-[11px] font-medium">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{m.name}</div>
                  <div className="text-[11px] text-muted capitalize">{m.role}</div>
                </div>
                {isSelected && <span className="text-ink text-sm">✓</span>}
              </button>
            );
          })}
        </div>

        {canEdit && (
          <button
            onClick={save}
            disabled={assignTask.isPending}
            className="w-full py-3 bg-ink text-white rounded-md text-[13px] font-medium disabled:opacity-50"
          >
            {assignTask.isPending ? "Guardando..." : "Guardar asignación"}
          </button>
        )}
      </div>
    </div>
  );
}
