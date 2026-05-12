"use client";

import { useEffect, useState } from "react";
import type { Project, Task } from "@/lib/types";
import { PRIORITY_OPTS, STATUS_OPTS, ENERGY_OPTS } from "@/lib/types";
import { useUpdateTask } from "@/lib/queries";
import { formatDate, priorityClass, statusClass, haptic } from "@/lib/utils";
import { Picker } from "./Picker";
import { useToast } from "./Toast";

interface Props {
  task: Task;
  projects: Project[];
  onClose: () => void;
}

function FileIcon({ type }: { type: string }) {
  if (type?.startsWith("image")) return <span>🖼</span>;
  if (type?.includes("pdf")) return <span>📄</span>;
  if (type?.includes("video")) return <span>🎬</span>;
  return <span>📎</span>;
}

export function TaskDetail({ task, projects, onClose }: Props) {
  const [picker, setPicker] = useState<null | "status" | "priority" | "energy">(null);
  const [brief, setBrief] = useState(task.brief);
  const [notes, setNotes] = useState(task.notes);
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const update = useUpdateTask();
  const toast = useToast();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const projNames = task.projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter(Boolean);

  const save = (fields: Partial<Task>, label = "Guardado") => {
    haptic();
    update.mutate(
      { taskId: task.id, fields },
      {
        onSuccess: () => toast("✓ " + label),
        onError: () => toast("⚠ Error"),
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] flex items-end" onClick={onClose}>
        <div
          className="modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] p-5 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4" />

          <h2 className="text-base font-medium leading-snug mb-3">{task.name}</h2>

          {projNames.length > 0 && (
            <div className="text-xs text-muted mb-4">{projNames.join(" · ")}</div>
          )}

          <div className="flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setPicker("status")} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusClass(task.status)}`}>
              {task.status}
            </button>
            <button onClick={() => setPicker("priority")} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${priorityClass(task.priority)}`}>
              {task.priority}
            </button>
            {task.dueDate && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted">
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.energy && (
              <button onClick={() => setPicker("energy")} className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted">
                {task.energy}
              </button>
            )}
          </div>

          {task.area.length > 0 && (
            <div className="text-xs text-muted mb-4">Áreas: {task.area.join(", ")}</div>
          )}

          <div className="mb-4">
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Brief / Contexto</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onBlur={() => brief !== task.brief && save({ brief })}
              rows={6}
              className="w-full p-3 bg-sand rounded-md text-sm resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Notas / sub-tareas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== task.notes && save({ notes })}
              rows={5}
              className="w-full p-3 bg-sand rounded-md text-sm resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink"
            />
          </div>

          {task.attachments.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-3">
                Archivos adjuntos ({task.attachments.length})
              </label>
              <div className="flex flex-col gap-2">
                {task.attachments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      if (a.type?.startsWith("image")) {
                        setPreview({ url: a.url, type: a.type, name: a.filename });
                      } else {
                        window.open(a.url, "_blank");
                      }
                    }}
                    className="flex items-center gap-3 p-3 bg-sand rounded-md text-left w-full active:scale-[0.98] transition-transform"
                  >
                    {a.type?.startsWith("image") ? (
                      <img
                        src={a.url}
                        alt={a.filename}
                        className="w-12 h-12 object-cover rounded-md shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-surface rounded-md flex items-center justify-center text-2xl shrink-0 border-[0.5px] border-hairline">
                        <FileIcon type={a.type} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.filename}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {a.type?.startsWith("image") ? "Toca para ver" : "Toca para abrir"}
                      </div>
                    </div>
                    <span className="text-muted text-lg">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full py-3 mt-2 bg-sand rounded-md text-sm font-medium">
            Cerrar
          </button>
        </div>
      </div>

      {/* Image preview modal */}
      {preview && preview.type?.startsWith("image") && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex flex-col"
          onClick={() => setPreview(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-white text-sm truncate flex-1">{preview.name}</span>
            <div className="flex gap-3 ml-3">
              
                href={preview.url}
                download={preview.name}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-white text-sm px-3 py-1.5 bg-white/20 rounded-full"
              >
                Descargar
              </a>
              <button onClick={() => setPreview(null)} className="text-white text-sm px-3 py-1.5 bg-white/20 rounded-full">
                Cerrar
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={preview.url}
              alt={preview.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {picker === "status" && (
        <Picker title="Cambiar status" options={STATUS_OPTS as unknown as string[]} current={task.status}
          onSelect={(v) => { save({ status: v as never }); setPicker(null); }} onClose={() => setPicker(null)} />
      )}
      {picker === "priority" && (
        <Picker title="Cambiar prioridad" options={PRIORITY_OPTS as unknown as string[]} current={task.priority}
          onSelect={(v) => { save({ priority: v as never }); setPicker(null); }} onClose={() => setPicker(null)} />
      )}
      {picker === "energy" && (
        <Picker title="Cambiar energía" options={ENERGY_OPTS as unknown as string[]} current={task.energy || ""}
          onSelect={(v) => { save({ energy: v as never }); setPicker(null); }} onClose={() => setPicker(null)} />
      )}
    </>
  );
}
