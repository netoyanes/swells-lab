"use client";

import { useState } from "react";
import type { Member, Project } from "@/lib/types";
import { PRIORITY_OPTS } from "@/lib/types";
import { useCreateTask, useCreateActivity, useAssignTask } from "@/lib/queries";
import { useToast } from "./Toast";
import { haptic } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

interface Props {
  projects: Project[];
  members: Member[];
  myUserId: string;
  myRole: string;
  onRefresh: () => void;
}

export function NewTaskFAB({ projects, members, myUserId, myRole, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("🟡 Medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const createTask = useCreateTask();
  const createActivity = useCreateActivity();
  const assignTask = useAssignTask();
  const toast = useToast();

  const canCreate = ["owner", "admin", "member"].includes(myRole);

  const resetForm = () => {
    setName("");
    setProjectId("");
    setPriority("🟡 Medium");
    setDueDate("");
    setAssigneeIds([]);
  };

  const handleClose = () => { setOpen(false); resetForm(); };

  const toggleAssignee = (uid: string) => {
    haptic();
    setAssigneeIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
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

      if (newTaskId) {
        await createActivity.mutateAsync({
          task_id: newTaskId,
          task_name: name.trim(),
          action: "created",
          payload: {},
        });

        if (assigneeIds.length > 0) {
          await assignTask.mutateAsync({
            task_id: newTaskId,
            user_ids: assigneeIds,
            task_name: name.trim(),
          });
        }
      }

      toast("✓ Tarea creada");
      handleClose();
      onRefresh();
    } catch {
      toast("⚠ Error al crear");
    }
  };

  if (!canCreate) return null;

  return (
    <>
      {/* FAB stack */}
      <div
        className="fixed bottom-5 right-5 flex flex-col gap-2.5 items-center z-40"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="w-11 h-11 rounded-full bg-surface border-[0.5px] border-hairline text-ink text-xl shadow-md flex items-center justify-center active:scale-95 transition-transform"
          title="Actualizar"
        >
          ⟳
        </button>
        {/* Create */}
        <button
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-full bg-ink text-white text-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title="Nueva tarea"
        >
          +
        </button>
      </div>

      {/* Create task sheet */}
      {open && (
        <BottomSheet onClose={handleClose} zIndex={100}>
          <h2 className="text-[15px] font-medium pt-1 mb-4">Nueva tarea</h2>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Nombre *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="¿Qué hay que hacer?"
                className="w-full px-3 py-3 bg-sand rounded-lg text-[14px] border-[0.5px] border-hairline focus:outline-none focus:border-ink/30"
              />
            </div>

            {/* Project */}
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Proyecto</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-3 bg-sand rounded-lg text-[13px] border-[0.5px] border-hairline focus:outline-none appearance-none"
              >
                <option value="">Sin proyecto</option>
                {projects
                  .filter((p) => p.status === "Active" || p.status === "Planning" || !p.status)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Prioridad</label>
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

            {/* Due date */}
            <div>
              <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-3 bg-sand rounded-lg text-[13px] border-[0.5px] border-hairline focus:outline-none"
              />
            </div>

            {/* Assignees */}
            {members.length > 0 && (
              <div>
                <label className="text-[11px] text-muted uppercase tracking-wider block mb-1">Asignar a</label>
                <div className="flex gap-1.5 flex-wrap">
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
                          <img src={m.avatar_url} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-sand flex items-center justify-center text-[9px]">
                            {m.name.charAt(0)}
                          </div>
                        )}
                        {m.name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!name.trim() || createTask.isPending}
            className="w-full py-3.5 mt-5 bg-ink text-white rounded-lg text-[13px] font-medium disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {createTask.isPending ? "Creando..." : "Crear tarea"}
          </button>
        </BottomSheet>
      )}
    </>
  );
}
