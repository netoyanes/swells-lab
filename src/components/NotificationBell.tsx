"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMarkNotificationsRead, useNotifications } from "@/lib/queries";
import type { AppNotification } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

interface Props {
  userId?: string;
  onOpenTask?: (taskId: string) => void;
}

export function NotificationBell({ userId, onOpenTask }: Props) {
  const [open, setOpen] = useState(false);
  const { data, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications: AppNotification[] = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // Supabase Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refetch]);

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

  const handleOpen = () => {
    setOpen(true);
    if (unreadCount > 0) {
      markRead.mutate();
    }
  };

  const handleNotifClick = (n: AppNotification) => {
    setOpen(false);
    if (n.task_id && onOpenTask) onOpenTask(n.task_id);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-sand text-[18px] active:scale-95 transition-transform"
        aria-label="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-[300px] max-h-[70vh] bg-surface border-[0.5px] border-hairline rounded-xl shadow-xl z-[200] overflow-hidden notif-panel">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-[0.5px] border-hairline">
            <span className="text-[13px] font-medium">Notificaciones</span>
            {notifications.length > 0 && (
              <button
                onClick={() => markRead.mutate()}
                className="text-[11px] text-muted"
              >
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[55vh]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-muted">
                Todo al día ✓
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b-[0.5px] border-hairline last:border-0 active:bg-sand transition-colors ${
                    !n.read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-ink leading-snug">{n.message}</div>
                      {n.task_name && (
                        <div className="text-[11px] text-muted mt-0.5 truncate">{n.task_name}</div>
                      )}
                      <div className="text-[10px] text-muted mt-1">{relativeTime(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
