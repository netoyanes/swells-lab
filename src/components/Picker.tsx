"use client";

import { BottomSheet } from "./BottomSheet";

interface PickerProps {
  title: string;
  options: string[];
  current: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

export function Picker({ title, options, current, onSelect, onClose }: PickerProps) {
  return (
    <BottomSheet onClose={onClose} zIndex={200}>
      <h3 className="text-[15px] font-medium mb-4 pt-1">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-3.5 rounded-lg border-[0.5px] text-[13px] font-medium text-center active:scale-[0.97] transition-transform ${
              opt === current
                ? "bg-ink text-white border-ink"
                : "bg-surface text-ink border-black/10 active:bg-sand"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-full mt-3 py-3 bg-sand rounded-lg text-[13px] font-medium text-muted"
      >
        Cancelar
      </button>
    </BottomSheet>
  );
}
