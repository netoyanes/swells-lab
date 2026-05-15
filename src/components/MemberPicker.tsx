"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";
import { useAssignTask } from "@/lib/queries";
import { useToast } from "./Toast";
import { haptic } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

interface Props {
  taskId: string;
  taskName: string;
  members: Member[];
  currentAssignees: string[];
  myRole: string;
  onClose: () => void;
  onSaved: (userIds: string[], names: string) => void;
}

export function MemberPicker({ taskId, taskName, members, currentAssignees, myRole, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentAssignees));
  const [search, setSearch] = useState("");
  const assignTask = useAssignTask();
  const toast = useToast();
  const canEdit = ["owner", "admin"].includes(myRole);

  const filtered = members.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

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

  const roleBadge: Record<string, string> = {
    owner: "👑 Owner",
    admin: "⚡ Admin",
    member: "👤 Member",
    viewer: "👁 Viewer",
  };

  return (
    <BottomSheet onClose={onClose} zIndex={200}>
      <h3 className="text-[15px] font-medium pt-1 mb-3">
        {canEdit ? "Asignar miembros" : "Asignados"}
      </h3>

      {members.length > 4 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full px-3 py-2 bg-sand rounded-lg text-[13px] border-[0.5px] border-hairline focus:outline-none mb-3"
        />
      )}

      <div className="space-y-1 mb-4">
        {filtered.map((m) => {
          const isSelected = selected.has(m.user_id);
          return (
            <button
              key={m.user_id}
              onClick={() => toggle(m.user_id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-[0.5px] transition-all text-left ${
                isSelected ? "border-ink/20 bg-ink/5" : "border-hairline bg-surface"
              } ${!canEdit ? "cursor-default" : "active:scale-[0.98]"}`}
            >
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? "bg-ink border-ink" : "border-black/20"
              }`}>
                {isSelected && <span className="text-white text-[10px]">✓</span>}
              </div>

              {/* Avatar */}
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{m.name}</div>
                <div className="text-[11px] text-muted">{roleBadge[m.role] || m.role}</div>
              </div>
            </button>
          );
        })}
      </div>

      {canEdit && (
        <button
          onClick={save}
          disabled={assignTask.isPending}
          className="w-full py-3 bg-ink text-white rounded-lg text-[13px] font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {assignTask.isPending ? "Guardando..." : `Guardar asignación (${selected.size})`}
        </button>
      )}
      {!canEdit && (
        <button
          onClick={onClose}
          className="w-full py-3 bg-sand text-muted rounded-lg text-[13px] font-medium"
        >
          Cerrar
        </button>
      )}
    </BottomSheet>
  );
}
