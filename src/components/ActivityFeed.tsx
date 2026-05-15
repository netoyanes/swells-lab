"use client";

import type { Member } from "@/lib/types";
import { useActivity } from "@/lib/queries";
import { ActivityItemRow } from "./ActivityItem";
import { CommentInput } from "./CommentInput";

interface Props {
  taskId: string;
  taskName: string;
  currentUser: Member | null;
}

function SkeletonRow() {
  return (
    <div className="flex gap-2.5 py-3 border-b-[0.5px] border-hairline skeleton">
      <div className="w-7 h-7 rounded-full bg-sand flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3 bg-sand rounded w-2/3 mb-2" />
        <div className="h-3 bg-sand rounded w-1/2" />
      </div>
    </div>
  );
}

export function ActivityFeed({ taskId, taskName, currentUser }: Props) {
  const { data: activities, isLoading, isError, refetch } = useActivity(taskId);

  return (
    <div className="mt-2">
      <label className="text-[11px] font-medium text-muted uppercase tracking-wider block mb-1">
        Actividad
      </label>

      {isLoading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : isError ? (
        <div className="text-center py-5">
          <p className="text-[12px] text-pUrgent-fg mb-2">⚠ Error cargando actividad</p>
          <button onClick={() => refetch()} className="text-[11px] text-muted underline">
            Reintentar
          </button>
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className="py-5 text-center text-[12px] text-muted">
          Aún no hay actividad en esta tarea
        </div>
      ) : (
        <div>
          {activities.map((item) => (
            <ActivityItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      <CommentInput taskId={taskId} taskName={taskName} currentUser={currentUser} />
    </div>
  );
}
