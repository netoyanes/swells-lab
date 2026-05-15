"use client";

import { useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  zIndex?: number;
}

export function BottomSheet({ onClose, children, className = "", maxHeight = "92vh", zIndex = 100 }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - startY.current;
    if (delta > 80) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] overflow-y-auto ${className}`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="sticky top-0 bg-surface pt-4 px-5 z-10">
          <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-1" />
        </div>
        <div className="px-5 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
