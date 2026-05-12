"use client";

import { useEffect, useState } from "react";
import type { Project, Task } from "@/lib/types";
import { PRIORITY_OPTS, STATUS_OPTS, ENERGY_OPTS } from "@/lib/types";
import { useUpdateTask } from "@/lib/queries";
import { formatDate, priorityClass, statusClass, haptic } from "@/lib/utils";
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
  onClose: () => void;
}

export function TaskDetail({ task, projects, members = [], onClose }: Props) {
  const [picker, setPicker] = useState<null | "status" | "priority" | "energy">(null);
  const [brief, setBrief] = useState(task.brief);
  const [notes, setNotes] = useState(task.notes);
  const update = useUpdateTask();
  const toast = useToast();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
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
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-end"
      onClick={onClose}
    >
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
          <button
            onClick={() => setPicker("status")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusClass(task.status)}`}
          >
            {task.status}
          </button>
          <button
            onClick={() => setPicker("priority")}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${priorityClass(task.priority)}`}
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
              onClick={() => setPicker("energy")}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-sand text-muted"
            >
              {task.energy}
            </button>
          )}
        </div>

        {task.area.length > 0 && (
          <div className="text-xs text-muted mb-4">
            Áreas: {task.area.join(", ")}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
            Brief / Contexto
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onBlur={() => brief !== task.brief && save({ brief })}
            rows={6}
            className="w-full p-3 bg-sand rounded-md text-sm resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
            Notas / sub-tareas
          </label>
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
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
              Adjuntos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {task.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square bg-sand rounded-md overflow-hidden"
                >
                  {a.type?.startsWith("image") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={a.filename}
                      className="w-full h-full object-cover"
                    />
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

        <button
          onClick={onClose}
          className="w-full py-3 mt-2 bg-sand rounded-md text-sm font-medium"
        >
          Cerrar
        </button>
      </div>

      {picker === "status" && (
        <Picker
          title="Cambiar status"
          options={STATUS_OPTS as unknown as string[]}
          current={task.status}
          onSelect={(v) => {
            save({ status: v as never });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "priority" && (
        <Picker
          title="Cambiar prioridad"
          options={PRIORITY_OPTS as unknown as string[]}
          current={task.priority}
          onSelect={(v) => {
            save({ priority: v as never });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "energy" && (
        <Picker
          title="Cambiar energía"
          options={ENERGY_OPTS as unknown as string[]}
          current={task.energy || ""}
          onSelect={(v) => {
            save({ energy: v as never });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
