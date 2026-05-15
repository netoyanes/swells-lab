"use client";

import { useEffect, useRef, useState } from "react";
import { useMarkNotificationsRead, useNotifications } from "@/lib/queries";
import type { AppNotification } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

interface Props {
  onOpenTask?: (taskId: string) => void;
}

export function NotificationBell({ onOpenTask }: Props) {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const handleOpen = () => {
    setOpen(true);
    if (unreadCount > 0) markRead.mutate();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotifClick = (n: AppNotification) => {
    setOpen(false);
    if (n.task_id && onOpenTask) onOpenTask(n.task_id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-sand text-ink"
        aria-label="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[70vh] overflow-y-auto bg-surface border-[0.5px] border-hairline rounded-xl shadow-lg z-[200]">
          <div className="flex items-center justify-between px-4 py-3 border-b-[0.5px] border-hairline">
            <span className="text-[13px] font-medium">Notificaciones</span>
            {notifications.length > 0 && (
              <button
                onClick={() => markRead.mutate()}
                className="text-[11px] text-muted"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-muted">Sin notificaciones</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`w-full text-left px-4 py-3 border-b-[0.5px] border-hairline last:border-0 hover:bg-sand transition-colors ${
                  !n.read ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="text-[12px] text-ink leading-snug">{n.message}</div>
                {n.task_name && (
                  <div className="text-[11px] text-muted mt-0.5 truncate">{n.task_name}</div>
                )}
                <div className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
