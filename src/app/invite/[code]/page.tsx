"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "joining">("loading");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    validateInvite();
  }, [code]);

  async function validateInvite() {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-validate?code=${code}`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.valid) {
        setRole(data.role);
        setStatus("valid");
      } else {
        setError(data.error || "Invitación inválida");
        setStatus("invalid");
      }
    } catch {
      setError("Error al validar la invitación");
      setStatus("invalid");
    }
  }

  async function joinWithGoogle() {
    setStatus("joining");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/?invite=${code}`,
        queryParams: { invite_code: code },
      },
    });
    if (error) {
      setError(error.message);
      setStatus("valid");
    }
  }

  const roleLabel: Record<string, string> = {
    owner: "Propietario",
    admin: "Administrador",
    member: "Miembro",
    viewer: "Observador",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-[400px]">
        <h1 className="text-2xl font-medium tracking-tight mb-1">SWELLS LAB</h1>
        <p className="text-sm text-muted mb-8">Te han invitado a unirte</p>

        {status === "loading" && (
          <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-6 text-center text-sm text-muted">
            Verificando invitación...
          </div>
        )}

        {status === "valid" && (
          <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🌊</div>
              <h2 className="text-base font-medium mb-1">Únete a SWELLS LAB</h2>
              <p className="text-sm text-muted">
                Entrarás como <strong>{roleLabel[role] || role}</strong>
              </p>
            </div>
            <button
              onClick={joinWithGoogle}
              className="w-full py-3 bg-ink text-white rounded-lg text-sm font-medium flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Entrar con Google
            </button>
            {error && <p className="text-xs text-red-500 mt-3 text-center">{error}</p>}
          </div>
        )}

        {status === "joining" && (
          <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-6 text-center text-sm text-muted">
            Abriendo Google...
          </div>
        )}

        {status === "invalid" && (
          <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-6 text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-base font-medium mb-2">Invitación inválida</h2>
            <p className="text-sm text-muted mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-ink underline"
            >
              Ir al inicio
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
