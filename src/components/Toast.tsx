"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastCtx = (msg: string) => void;
const ToastContext = createContext<ToastCtx>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    setTimeout(() => setShow(false), 1800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 bg-ink text-white px-4 py-2.5 rounded-full text-sm z-[200] transition-opacity pointer-events-none max-w-[90%] text-center ${
          show ? "opacity-100" : "opacity-0"
        }`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
