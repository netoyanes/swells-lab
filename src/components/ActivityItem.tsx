"use client";

import { useState } from "react";
import type { ActivityItem as ActivityItemType } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";

function Avatar({ name, url, size = 7 }: { name: string; url: string | null; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full bg-sand flex items-center justify-center text-[9px] font-medium text-muted flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface Props {
  item: ActivityItemType;
}

export function ActivityItemRow({ item }: Props) {
  const [viewImg, setViewImg] = useState<string | null>(null);
  const name = item.user_name || "?";
  const time = relativeTime(item.created_at);

  const renderContent = () => {
    switch (item.action) {
      case "status_change":
        return (
          <div className="text-[12px] text-muted">
            <span className="text-ink font-medium">{name}</span> cambió el status{" "}
            <span className="line-through opacity-50">{item.payload.from}</span>
            {" → "}
            <span className="font-medium text-ink">{item.payload.to}</span>
          </div>
        );
      case "priority_change":
        return (
          <div className="text-[12px] text-muted">
            <span className="text-ink font-medium">{name}</span> cambió la prioridad a{" "}
            <span className="font-medium text-ink">{item.payload.to}</span>
          </div>
        );
      case "assignment":
        return (
          <div className="text-[12px] text-muted">
            <span className="text-ink font-medium">{name}</span> asignó a{" "}
            <span className="font-medium text-ink">{item.payload.assigned_to_names}</span>
          </div>
        );
      case "created":
        return (
          <div className="text-[12px] text-muted">
            <span className="text-ink font-medium">{name}</span> creó esta tarea
          </div>
        );
      case "comment":
        return (
          <div>
            <div className="text-[12px] text-ink leading-relaxed">
              {item.payload.message}
            </div>
            {item.payload.photo_url && (
              <button onClick={() => setViewImg(item.payload.photo_url || null)} className="mt-2 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.payload.photo_url}
                  alt="foto"
                  className="rounded-lg object-cover max-w-[180px] max-h-[180px]"
                />
              </button>
            )}
          </div>
        );
      case "checkin":
        return (
          <div>
            <div className="text-[12px] text-muted mb-1.5">
              <span className="text-ink font-medium">{name}</span> reportó avance 📍
            </div>
            {item.payload.photo_url && (
              <button onClick={() => setViewImg(item.payload.photo_url || null)} className="block mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.payload.photo_url}
                  alt="checkin"
                  className="w-full rounded-lg object-cover max-h-[200px]"
                />
              </button>
            )}
            {item.payload.caption && (
              <div className="text-[12px] text-ink">{item.payload.caption}</div>
            )}
            {item.payload.latitude && (
              <div className="text-[11px] text-muted mt-1">
                📍 {item.payload.latitude?.toFixed(4)}, {item.payload.longitude?.toFixed(4)}
              </div>
            )}
          </div>
        );
      default:
        return <div className="text-[12px] text-muted">{item.action}</div>;
    }
  };

  const showAvatar = !["comment", "checkin"].includes(item.action);

  return (
    <>
      <div className="flex gap-2.5 py-3 border-b-[0.5px] border-hairline last:border-0">
        {showAvatar ? (
          <Avatar name={name} url={item.user_avatar} size={7} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Avatar name={name} url={item.user_avatar} size={7} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {["comment", "checkin"].includes(item.action) && (
            <div className="text-[11px] font-medium text-ink mb-1">{name}</div>
          )}
          {renderContent()}
          <div className="text-[10px] text-muted mt-1.5">{time}</div>
        </div>
      </div>

      {viewImg && (
        <ImageViewer url={viewImg} onClose={() => setViewImg(null)} />
      )}
    </>
  );
}
