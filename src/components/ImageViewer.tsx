"use client";

import { useEffect, useRef } from "react";

interface Props {
  url: string;
  filename?: string;
  onClose: () => void;
}

export function ImageViewer({ url, filename, onClose }: Props) {
  const startY = useRef(0);

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - startY.current > 60) onClose();
  };

  const isPdf = url.toLowerCase().includes(".pdf") || filename?.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 bg-black z-[300] flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 safe-area-top"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/70 text-[12px] truncate max-w-[200px]">{filename}</span>
        <div className="flex items-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 text-[12px] underline"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir
          </a>
          <button onClick={onClose} className="text-white text-xl w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-white/70 text-sm mb-4">{filename}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-ink px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              Abrir en Safari
            </a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={filename || "imagen"}
            className="max-w-full max-h-full object-contain scale-in rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
