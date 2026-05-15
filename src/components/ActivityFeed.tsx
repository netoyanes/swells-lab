"use client";

import { useState } from "react";
import type { ActivityItem, Member } from "@/lib/types";
import { useActivity, useCreateActivity } from "@/lib/queries";
import { useToast } from "./Toast";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function Avatar({ name, avatarUrl, size = 7 }: { name: string; avatarUrl: string | null; size?: number }) {
  const sz = `w-${size} h-${size}`;
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-sand flex items-center justify-center text-[10px] font-medium flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const [imgOpen, setImgOpen] = useState(false);

  let content: React.ReactNode = null;
  switch (item.action) {
    case "status_change":
      content = (
        <span className="text-[12px] text-muted">
          <span className="font-medium text-ink">{item.user_name}</span> cambió el status{" "}
          <span className="line-through opacity-50">{item.payload.from}</span>{" → "}
          <span className="font-medium">{item.payload.to}</span>
        </span>
      );
      break;
    case "priority_change":
      content = (
        <span className="text-[12px] text-muted">
          <span className="font-medium text-ink">{item.user_name}</span> cambió la prioridad a{" "}
          <span className="font-medium">{item.payload.to}</span>
        </span>
      );
      break;
    case "assignment":
      content = (
        <span className="text-[12px] text-muted">
          <span className="font-medium text-ink">{item.user_name}</span> asignó esta tarea a{" "}
          <span className="font-medium">{item.payload.assigned_to_names}</span>
        </span>
      );
      break;
    case "created":
      content = (
        <span className="text-[12px] text-muted">
          <span className="font-medium text-ink">{item.user_name}</span> creó esta tarea
        </span>
      );
      break;
    case "comment":
    case "checkin":
      content = (
        <div>
          <div className="text-[12px] text-ink mb-1">
            {item.action === "checkin" && (
              <span className="text-muted mr-1">📍 Check-in · </span>
            )}
            {item.payload.message || item.payload.caption}
          </div>
          {item.payload.photo_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.payload.photo_url}
                alt="foto"
                className="w-full max-w-[200px] rounded-md object-cover cursor-pointer mt-1"
                onClick={() => setImgOpen(true)}
              />
              {imgOpen && (
                <div
                  className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
                  onClick={() => setImgOpen(false)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.payload.photo_url} alt="foto" className="max-w-full max-h-full rounded-lg" />
                </div>
              )}
            </>
          )}
          {item.payload.latitude && (
            <div className="text-[11px] text-muted mt-1">
              📍 {item.payload.latitude?.toFixed(4)}, {item.payload.longitude?.toFixed(4)}
            </div>
          )}
        </div>
      );
      break;
    default:
      content = <span className="text-[12px] text-muted">{item.action}</span>;
  }

  return (
    <div className="flex gap-2.5 py-2.5 border-b-[0.5px] border-hairline last:border-0">
      <Avatar name={item.user_name || "?"} avatarUrl={item.user_avatar} size={6} />
      <div className="flex-1 min-w-0">
        {content}
        <div className="text-[10px] text-muted mt-1">{timeAgo(item.created_at)}</div>
      </div>
    </div>
  );
}

interface Props {
  taskId: string;
  taskName: string;
  currentUser: Member | null;
}

export function ActivityFeed({ taskId, taskName, currentUser }: Props) {
  const { data: activities = [], isLoading } = useActivity(taskId);
  const createActivity = useCreateActivity();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendComment = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await createActivity.mutateAsync({
        task_id: taskId,
        task_name: taskName,
        action: "comment",
        payload: { message: message.trim() },
      });
      setMessage("");
    } catch {
      toast("⚠ Error al enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">
        Actividad
      </label>

      {isLoading ? (
        <div className="text-[12px] text-muted py-3 text-center">Cargando...</div>
      ) : activities.length === 0 ? (
        <div className="text-[12px] text-muted py-3 text-center">Sin actividad aún</div>
      ) : (
        <div className="mb-3">
          {activities.map((a) => <ActivityRow key={a.id} item={a} />)}
        </div>
      )}

      {currentUser && (
        <div className="flex gap-2 mt-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendComment()}
            placeholder="Escribe un comentario..."
            className="flex-1 px-3 py-2 bg-sand rounded-md text-[13px] border-[0.5px] border-hairline focus:outline-none focus:border-ink"
          />
          <button
            onClick={sendComment}
            disabled={!message.trim() || sending}
            className="px-3 py-2 bg-ink text-white rounded-md text-[12px] font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
