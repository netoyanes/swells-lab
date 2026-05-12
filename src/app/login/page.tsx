"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <h1 className="text-2xl font-medium tracking-tight mb-1">
          SWELLS LAB
        </h1>
        <p className="text-sm text-muted mb-6">Mando de control</p>

        {status === "sent" ? (
          <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-5">
            <h2 className="text-base font-medium mb-2">Revisa tu correo</h2>
            <p className="text-sm text-muted">
              Te enviamos un enlace mágico a <strong>{email}</strong>. Haz clic
              y entrarás automáticamente.
            </p>
          </div>
        ) : (
          <form
            onSubmit={sendMagicLink}
            className="bg-surface border-[0.5px] border-hairline rounded-lg p-5"
          >
            <label className="text-sm font-medium block mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full p-3 border-[0.5px] border-black/20 rounded-md text-sm mb-3 focus:outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-3 bg-ink text-white rounded-md text-sm font-medium disabled:opacity-60"
            >
              {status === "sending" ? "Enviando..." : "Enviar enlace mágico"}
            </button>
            {errorMsg && (
              <p className="text-xs text-pUrgent-fg mt-3">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
