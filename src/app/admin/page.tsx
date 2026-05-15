"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updateMemberRole } from "@/lib/api";

interface Member {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface InviteResult {
  inviteUrl: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "👑 Owner",
  admin: "⚡ Admin",
  member: "👤 Member",
  viewer: "👁 Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-pUrgent-bg text-pUrgent-fg",
  admin: "bg-sProgress-bg text-sProgress-fg",
  member: "bg-sDone-bg text-sDone-fg",
  viewer: "bg-sand text-muted",
};

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [myUserId, setMyUserId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [inviteRole, setInviteRole] = useState("member");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setMyUserId(session.user.id);

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/members-get`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json();
    if (data.members) {
      setMembers(data.members);
      const me = data.members.find((m: Member) => m.user_id === session.user.id);
      setMyRole(me?.role || "member");
    }
    setLoading(false);
  }

  async function createInvite() {
    setCreating(true);
    setInvite(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-create`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: inviteRole }),
    });
    const data = await res.json();
    if (data.inviteUrl) setInvite(data);
    setCreating(false);
  }

  async function changeRole(userId: string, newRole: string) {
    if (userId === myUserId) return; // can't change own role
    setUpdatingRole(userId);
    try {
      const updated = await updateMemberRole({ user_id: userId, role: newRole });
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: updated.member.role } : m));
      showToast("✓ Rol actualizado");
    } catch {
      showToast("⚠ Error al actualizar");
    } finally {
      setUpdatingRole(null);
    }
  }

  function copyLink() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!invite) return;
    const msg = encodeURIComponent(`Te invito a SWELLS LAB 🌊\n\n${invite.inviteUrl}\n\nEl link expira en 7 días.`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const canManage = ["owner", "admin"].includes(myRole);
  const isOwner = myRole === "owner";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando...</div>;
  }

  return (
    <main className="max-w-[480px] mx-auto px-3.5 py-6 pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-xs px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-muted text-lg">←</button>
        <div>
          <h1 className="text-lg font-medium">Equipo SWELLS LAB</h1>
          <p className="text-xs text-muted">Gestión del equipo</p>
        </div>
      </div>

      {/* Members list */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
          Miembros ({members.length})
        </h2>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.user_id} className="bg-surface border-[0.5px] border-hairline rounded-lg p-3.5">
              <div className="flex items-center gap-3">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt={m.name} className="w-9 h-9 rounded-full shrink-0 object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sand flex items-center justify-center text-sm font-medium shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {m.name}
                    {m.user_id === myUserId && (
                      <span className="text-[10px] text-muted">(tú)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate">{m.email}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role] || "bg-sand text-muted"}`}>
                  {ROLE_LABELS[m.role] || m.role}
                </span>
              </div>

              {/* Role management — owner only, not self */}
              {isOwner && m.user_id !== myUserId && (
                <div className="mt-3 pt-3 border-t-[0.5px] border-hairline">
                  <p className="text-[11px] text-muted mb-1.5">Cambiar rol:</p>
                  <div className="flex gap-1.5">
                    {["admin", "member", "viewer"].map((r) => (
                      <button
                        key={r}
                        onClick={() => changeRole(m.user_id, r)}
                        disabled={m.role === r || updatingRole === m.user_id}
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-medium border-[0.5px] transition ${
                          m.role === r
                            ? "bg-ink text-white border-ink"
                            : "bg-sand text-muted border-hairline"
                        } disabled:opacity-50`}
                      >
                        {updatingRole === m.user_id ? "..." : ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite section */}
      {canManage && (
        <div className="bg-surface border-[0.5px] border-hairline rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Invitar nuevo miembro</h2>

          <label className="text-xs text-muted block mb-1.5">Rol</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {["member", "admin", "viewer"].map((r) => (
              <button
                key={r}
                onClick={() => setInviteRole(r)}
                className={`py-2 rounded-md text-xs font-medium border-[0.5px] ${
                  inviteRole === r ? "bg-ink text-white border-ink" : "bg-sand text-ink border-black/10"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          <button
            onClick={createInvite}
            disabled={creating}
            className="w-full py-3 bg-ink text-white rounded-md text-sm font-medium disabled:opacity-60 mb-3"
          >
            {creating ? "Generando..." : "Generar link de invitación"}
          </button>

          {invite && (
            <div className="bg-sand rounded-md p-3">
              <p className="text-xs text-muted mb-1">Link generado · expira en 7 días · {ROLE_LABELS[invite.role]}</p>
              <p className="text-xs font-mono break-all text-ink mb-3">{invite.inviteUrl}</p>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 py-2.5 bg-surface border-[0.5px] border-black/10 rounded-md text-xs font-medium"
                >
                  {copied ? "✓ Copiado" : "Copiar link"}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 py-2.5 bg-[#25D366] text-white rounded-md text-xs font-medium"
                >
                  Enviar por WA 💬
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
