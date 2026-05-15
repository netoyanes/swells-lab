"use client";

import { useState } from "react";
import type { Member, Project, Task } from "@/lib/types";
import { ENERGY_OPTS, PRIORITY_OPTS, STATUS_OPTS } from "@/lib/types";
import { useCreateActivity, useUpdateTask } from "@/lib/queries";
import { formatDate, haptic, priorityClass, statusClass } from "@/lib/utils";
import { Picker } from "./Picker";
import { useToast } from "./Toast";
import { ActivityFeed } from "./ActivityFeed";
import { CheckinFlow } from "./CheckinFlow";
import { MemberPicker } from "./MemberPicker";
import { ImageViewer } from "./ImageViewer";
import { BottomSheet } from "./BottomSheet";

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
  const [viewImg, setViewImg] = useState<{ url: string; filename: string } | null>(null);
  const [brief, setBrief] = useState(task.brief);
  const [notes, setNotes] = useState(task.notes);
  const [localAssignees, setLocalAssignees] = useState<string[]>(task.assignees || []);
  const update = useUpdateTask();
  const createActivity = useCreateActivity();
  const toast = useToast();

  const currentMember = members.find((m) => m.user_id === myUserId) || null;
  const canEdit = ["owner", "admin"].includes(myRole) || localAssignees.includes(myUserId);

  const projNames = task.projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean);

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
        onError: () => toast("⚠ Error — cambio revertido"),
      }
    );
  };

  const handleStatusChange = (v: string) => {
    save({ status: v as never }, "Status actualizado", "status_change", { from: task.status, to: v });
    setPicker(null);
  };

  const handlePriorityChange = (v: string) => {
    save({ priority: v as never }, "Prioridad actualizada", "priority_change", { from: task.priority, to: v });
    setPicker(null);
  };

  const assignedMembers = localAssignees
    .map((uid) => members.find((m) => m.user_id === uid))
    .filter(Boolean) as Member[];

  return (
    <>
      <BottomSheet onClose={onClose} maxHeight="92vh" zIndex={100}>
        {/* Title */}
        <h2 className="text-[16px] font-medium leading-snug mb-1 pt-1">{task.name}</h2>
        {projNames.length > 0 && (
          <div className="text-[12px] text-muted mb-3">{projNames.join(" · ")}</div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => canEdit && setPicker("status")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusClass(task.status)} ${canEdit ? "active:scale-95 transition-transform" : "cursor-default"}`}
          >
            {task.status}
          </button>
          <button
            onClick={() => canEdit && setPicker("priority")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${priorityClass(task.priority)} ${canEdit ? "active:scale-95 transition-transform" : "cursor-default"}`}
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
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted ${canEdit ? "active:scale-95" : "cursor-default"}`}
            >
              {task.energy}
            </button>
          )}
        </div>

        {task.area.length > 0 && (
          <div className="text-[11px] text-muted mb-4">Áreas: {task.area.join(", ")}</div>
        )}

        {/* Assignees */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-muted uppercase tracking-wider">
              Asignado a
            </label>
            <button
              onClick={() => setShowAssignees(true)}
              className="text-[11px] text-muted bg-sand px-2.5 py-1 rounded-full"
            >
              {canEdit && ["owner", "admin"].includes(myRole) ? "✏️ Editar" : "Ver equipo"}
            </button>
          </div>
          {assignedMembers.length === 0 ? (
            <span className="text-[12px] text-muted">Sin asignar</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {assignedMembers.slice(0, 4).map((m, i) => (
                  <div key={m.user_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }} className="relative">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.name} title={m.name}
                        className="w-7 h-7 rounded-full border-[1.5px] border-white object-cover" />
                    ) : (
                      <div title={m.name}
                        className="w-7 h-7 rounded-full border-[1.5px] border-white bg-sand flex items-center justify-center text-[10px] font-medium">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {assignedMembers.length > 4 && (
                  <div className="w-7 h-7 rounded-full border-[1.5px] border-white bg-ink text-white flex items-center justify-center text-[9px] font-medium" style={{ marginLeft: -8 }}>
                    +{assignedMembers.length - 4}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted">
                {assignedMembers.slice(0, 2).map((m) => m.name.split(" ")[0]).join(", ")}
                {assignedMembers.length > 2 ? ` +${assignedMembers.length - 2}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Check-in button */}
        <div className="mb-4">
          {showCheckin ? (
            <CheckinFlow
              taskId={task.id}
              taskName={task.name}
              onDone={() => setShowCheckin(false)}
            />
          ) : (
            <button
              onClick={() => setShowCheckin(true)}
              className="w-full py-3 bg-ink text-white rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              📸 Reportar avance
            </button>
          )}
        </div>

        {/* Brief */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1.5">
            Brief / Contexto
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onBlur={() => brief !== task.brief && canEdit && save({ brief })}
            readOnly={!canEdit}
            rows={5}
            className="w-full p-3 bg-sand rounded-lg text-[14px] resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink/30 leading-relaxed"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1.5">
            Notas / sub-tareas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== task.notes && canEdit && save({ notes })}
            readOnly={!canEdit}
            rows={4}
            className="w-full p-3 bg-sand rounded-lg text-[14px] resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink/30 leading-relaxed"
          />
        </div>

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <div className="mb-4">
            <label className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1.5">
              Archivos adjuntos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {task.attachments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setViewImg({ url: a.url, filename: a.filename })}
                  className="aspect-square bg-sand rounded-lg overflow-hidden"
                >
                  {a.type?.startsWith("image") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <span className="text-2xl mb-1">📄</span>
                      <span className="text-[9px] text-muted text-center leading-tight truncate w-full">{a.filename}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity */}
        <ActivityFeed taskId={task.id} taskName={task.name} currentUser={currentMember} />

        <button
          onClick={onClose}
          className="w-full py-3 mt-4 bg-sand rounded-lg text-[13px] font-medium text-muted"
        >
          Cerrar
        </button>
      </BottomSheet>

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

      {/* Member picker */}
      {showAssignees && (
        <MemberPicker
          taskId={task.id}
          taskName={task.name}
          members={members}
          currentAssignees={localAssignees}
          myRole={myRole}
          onClose={() => setShowAssignees(false)}
          onSaved={(ids) => {
            setLocalAssignees(ids);
          }}
        />
      )}

      {/* Image viewer */}
      {viewImg && (
        <ImageViewer url={viewImg.url} filename={viewImg.filename} onClose={() => setViewImg(null)} />
      )}
    </>
  );
}
