"use client";

import { useEffect, useState } from "react";
import type { Member, Project, Task } from "@/lib/types";
import { ENERGY_OPTS, PRIORITY_OPTS, STATUS_OPTS } from "@/lib/types";
import { useCreateActivity, useUpdateTask } from "@/lib/queries";
import { formatDate, haptic, priorityClass, statusClass } from "@/lib/utils";
import { Picker } from "./Picker";
import { useToast } from "./Toast";
import { ActivityFeed } from "./ActivityFeed";
import { CheckIn } from "./CheckIn";
import { AssigneePicker } from "./AssigneePicker";

interface Props {
  task: Task;
  projects: Project[];
  members?: Member[];
  myUserId?: string;
  myRole?: string;
  onClose: () => void;
}

export function TaskDetail({ task, projects, members = [], myUserId = "", myRole = "member", onClose }: Props) {
  const [picker, setPicker] = useState<null | "status" | "priority" | "energy">(null);
  const [showAssignees, setShowAssignees] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [brief, setBrief] = useState(task.brief);
  const [notes, setNotes] = useState(task.notes);
  const [localAssignees, setLocalAssignees] = useState<string[]>(task.assignees || []);
  const update = useUpdateTask();
  const createActivity = useCreateActivity();
  const toast = useToast();

  const currentMember = members.find((m) => m.user_id === myUserId) || null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setBrief(task.brief);
    setNotes(task.notes);
    setLocalAssignees(task.assignees || []);
  }, [task]);

  const projNames = task.projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean);

  const canEdit = ["owner", "admin"].includes(myRole) ||
    localAssignees.includes(myUserId);

  const save = async (fields: Partial<Task>, label = "Guardado", logAction?: string, logPayload?: Record<string, unknown>) => {
    haptic();
    update.mutate(
      { taskId: task.id, fields },
      {
        onSuccess: () => {
          toast("✓ " + label);
          if (logAction) {
            createActivity.mutate({
              task_id: task.id,
              task_name: task.name,
              action: logAction,
              payload: logPayload || {},
            });
          }
        },
        onError: () => toast("⚠ Error"),
      }
    );
  };

  const handleStatusChange = (v: string) => {
    save(
      { status: v as never },
      "Status actualizado",
      "status_change",
      { from: task.status, to: v }
    );
    setPicker(null);
  };

  const handlePriorityChange = (v: string) => {
    save(
      { priority: v as never },
      "Prioridad actualizada",
      "priority_change",
      { from: task.priority, to: v }
    );
    setPicker(null);
  };

  const assignedMembers = localAssignees
    .map((uid) => members.find((m) => m.user_id === uid))
    .filter(Boolean) as Member[];

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-end"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4" />

        <h2 className="text-base font-medium leading-snug mb-3">{task.name}</h2>

        {projNames.length > 0 && (
          <div className="text-xs text-muted mb-4">{projNames.join(" · ")}</div>
        )}

        {/* Status / Priority / Date chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => canEdit && setPicker("status")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusClass(task.status)} ${canEdit ? "" : "cursor-default"}`}
          >
            {task.status}
          </button>
          <button
            onClick={() => canEdit && setPicker("priority")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${priorityClass(task.priority)} ${canEdit ? "" : "cursor-default"}`}
          >
            {task.priority}
          </button>
          {task.dueDate && (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted">
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.energy && (
            <button
              onClick={() => canEdit && setPicker("energy")}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted ${canEdit ? "" : "cursor-default"}`}
            >
              {task.energy}
            </button>
          )}
        </div>

        {task.area.length > 0 && (
          <div className="text-xs text-muted mb-4">Áreas: {task.area.join(", ")}</div>
        )}

        {/* Assignees section */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
            Asignado a
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {assignedMembers.length === 0 ? (
              <span className="text-[12px] text-muted">Sin asignar</span>
            ) : (
              <div className="flex items-center gap-1">
                {assignedMembers.slice(0, 4).map((m) => (
                  m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={m.user_id} src={m.avatar_url} alt={m.name} title={m.name}
                      className="w-7 h-7 rounded-full border border-white -ml-1 first:ml-0 object-cover" />
                  ) : (
                    <div key={m.user_id} title={m.name}
                      className="w-7 h-7 rounded-full bg-sand border border-white -ml-1 first:ml-0 flex items-center justify-center text-[10px] font-medium">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )
                ))}
                {assignedMembers.length > 4 && (
                  <span className="text-[11px] text-muted ml-1">+{assignedMembers.length - 4}</span>
                )}
                <span className="text-[11px] text-muted ml-1.5">
                  {assignedMembers.map((m) => m.name.split(" ")[0]).join(", ")}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowAssignees(true)}
              className="ml-auto text-[11px] text-muted px-2.5 py-1 bg-sand rounded-full"
            >
              {["owner", "admin"].includes(myRole) ? "✏️ Editar" : "Ver"}
            </button>
          </div>
        </div>

        {/* Check-in button */}
        <div className="mb-4">
          {showCheckin ? (
            <CheckIn
              taskId={task.id}
              taskName={task.name}
              onDone={() => setShowCheckin(false)}
            />
          ) : (
            <button
              onClick={() => setShowCheckin(true)}
              className="w-full py-2.5 border-[0.5px] border-hairline rounded-md text-[13px] font-medium text-muted flex items-center justify-center gap-1.5 active:bg-sand transition-colors"
            >
              📸 Reportar avance
            </button>
          )}
        </div>

        {/* Brief */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
            Brief / Contexto
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onBlur={() => brief !== task.brief && canEdit && save({ brief })}
            readOnly={!canEdit}
            rows={5}
            className="w-full p-3 bg-sand rounded-md text-sm resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
            Notas / sub-tareas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== task.notes && canEdit && save({ notes })}
            readOnly={!canEdit}
            rows={4}
            className="w-full p-3 bg-sand rounded-md text-sm resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink"
          />
        </div>

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
              Adjuntos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {task.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="block aspect-square bg-sand rounded-md overflow-hidden">
                  {a.type?.startsWith("image") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted p-2 text-center">
                      {a.filename}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed taskId={task.id} taskName={task.name} currentUser={currentMember} />

        <button
          onClick={onClose}
          className="w-full py-3 mt-4 bg-sand rounded-md text-sm font-medium"
        >
          Cerrar
        </button>
      </div>

      {/* Pickers */}
      {picker === "status" && (
        <Picker title="Cambiar status" options={STATUS_OPTS as unknown as string[]}
          current={task.status} onSelect={handleStatusChange} onClose={() => setPicker(null)} />
      )}
      {picker === "priority" && (
        <Picker title="Cambiar prioridad" options={PRIORITY_OPTS as unknown as string[]}
          current={task.priority} onSelect={handlePriorityChange} onClose={() => setPicker(null)} />
      )}
      {picker === "energy" && (
        <Picker title="Cambiar energía" options={ENERGY_OPTS as unknown as string[]}
          current={task.energy || ""} onSelect={(v) => { save({ energy: v as never }); setPicker(null); }}
          onClose={() => setPicker(null)} />
      )}

      {/* Assignee picker */}
      {showAssignees && (
        <AssigneePicker
          taskId={task.id}
          taskName={task.name}
          members={members}
          currentAssignees={localAssignees}
          myRole={myRole}
          onClose={() => setShowAssignees(false)}
          onSaved={(ids, names) => {
            setLocalAssignees(ids);
            update.mutate({ taskId: task.id, fields: { assignees: ids, assigneeNames: names } as never });
          }}
        />
      )}
    </div>
  );
}
