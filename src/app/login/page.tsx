"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) setErrorMsg(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-8">
          <h1 className="text-[24px] font-medium tracking-tight">SWELLS LAB</h1>
          <p className="text-[13px] text-muted mt-0.5">Mando de control</p>
        </div>

        {status === "sent" ? (
          <div className="bg-surface border-[0.5px] border-hairline rounded-xl p-6 text-center fade-in">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="text-[15px] font-medium mb-2">Revisa tu correo</h2>
            <p className="text-[13px] text-muted leading-relaxed">
              Te enviamos un enlace mágico a{" "}
              <span className="text-ink font-medium">{email}</span>.
              <br />Haz clic y entrarás automáticamente.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-[12px] text-muted underline"
            >
              Usar otro correo
            </button>
          </div>
        ) : (
          <div className="bg-surface border-[0.5px] border-hairline rounded-xl p-5">
            {/* Google OAuth */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-surface border-[0.5px] border-black/15 rounded-lg text-[14px] font-medium text-ink active:bg-sand transition-colors"
            >
              <GoogleIcon />
              Continuar con Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-black/8" />
              <span className="text-[11px] text-muted">o con email</span>
              <div className="flex-1 h-px bg-black/8" />
            </div>

            {/* Magic link form */}
            <form onSubmit={sendMagicLink}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full p-3 border-[0.5px] border-black/15 rounded-lg text-[14px] mb-3 focus:outline-none focus:border-ink bg-bg"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-3 bg-ink text-white rounded-lg text-[14px] font-medium disabled:opacity-60 active:scale-[0.98] transition-transform"
              >
                {status === "sending" ? "Enviando..." : "Enviar enlace mágico"}
              </button>
            </form>

            {errorMsg && (
              <p className="text-[12px] text-pUrgent-fg mt-3 text-center">{errorMsg}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
