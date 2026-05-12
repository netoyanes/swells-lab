"use client";

import { useEffect } from "react";

interface PickerProps {
  title: string;
  options: string[];
  current: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

export function Picker({ title, options, current, onSelect, onClose }: PickerProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-end"
      onClick={onClose}
    >
      <div
        className="modal-sheet bg-surface w-full max-w-[480px] mx-auto rounded-t-[20px] p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-3" />
        <h3 className="text-base font-medium mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`px-3 py-3 rounded-md border-[0.5px] text-sm font-medium text-center ${
                opt === current
                  ? "bg-ink text-white border-ink"
                  : "bg-surface text-ink border-black/10"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-sand rounded-md text-sm font-medium"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
