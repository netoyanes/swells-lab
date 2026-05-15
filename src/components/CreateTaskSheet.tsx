"use client";

import { useState } from "react";
import type { Member, Project } from "@/lib/types";
import { PRIORITY_OPTS } from "@/lib/types";
import { useCreateTask, useCreateActivity, useAssignTask } from "@/lib/queries";
import { useToast } from "./Toast";
import { haptic } from "@/lib/utils";

interface Props {
  projects: Project[];
  members: Member[];
  myUserId: string;
  onClose: () => void;
}

export function CreateTaskSheet({ projects, members, myUserId, onClose }: Props) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("🟡 Medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const createTask = useCreateTask();
  const createActivity = useCreateActivity();
  const assignTask = useAssignTask();
  const toast = useToast();

  const toggleAssignee = (uid: string) => {
    haptic();
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const submit = async () => {
    if (!name.trim()) return;
    haptic();
    try {
      const fields: Record<string, unknown> = {
        name: name.trim(),
        priority,
        status: "📥 Inbox",
      };
      if (projectId) fields.projectIds = [projectId];
      if (dueDate) fields.dueDate = dueDate;

      const result = await createTask.mutateAsync(fields as never);
      const newTaskId = result.record.id;

      // Log creation
      await createActivity.mutateAsync({
        task_id: newTaskId,
        task_name: name.trim(),
        action: "created",
        payload: {},
      });

      // Assign if needed
      if (assigneeIds.length > 0 && newTaskId) {
        await assignTask.mutateAsync({
          task_id: newTaskId,
          user_ids: assigneeIds,
          task_name: name.trim(),
        });
      }

      toast("✓ Tarea creada");
      onClose();
    } catch {
      toast("⚠ Error al crear");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-end"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4" />
        <h2 className="text-[15px] font-medium mb-4">Nueva tarea</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">Nombre *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              className="w-full px-3 py-2.5 bg-sand rounded-md text-[14px] border-[0.5px] border-hairline focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Proyecto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2.5 bg-sand rounded-md text-[13px] border-[0.5px] border-hairline focus:outline-none appearance-none"
            >
              <option value="">Sin proyecto</option>
              {projects
                .filter((p) => p.status === "Active" || p.status === "Planning")
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Prioridad</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { haptic(); setPriority(p); }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition ${
                    priority === p ? "bg-ink text-white border-ink" : "bg-surface text-muted border-hairline"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Fecha límite</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-sand rounded-md text-[13px] border-[0.5px] border-hairline focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Asignar a</label>
            <div className="flex gap-2 flex-wrap">
              {members.map((m) => {
                const sel = assigneeIds.includes(m.user_id);
                return (
                  <button
                    key={m.user_id}
                    onClick={() => toggleAssignee(m.user_id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] border-[0.5px] transition ${
                      sel ? "bg-ink text-white border-ink" : "bg-surface text-muted border-hairline"
                    }`}
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.name} className="w-4 h-4 rounded-full" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-sand flex items-center justify-center text-[9px]">
                        {m.name.charAt(0)}
                      </span>
                    )}
                    {m.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!name.trim() || createTask.isPending}
          className="w-full py-3 mt-5 bg-ink text-white rounded-md text-[13px] font-medium disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {createTask.isPending ? "Creando..." : "Crear tarea"}
        </button>
      </div>
    </div>
  );
}
