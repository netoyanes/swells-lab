"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PortalData {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    type: string;
  };
  tasks: Array<{ id: string; name: string; status: string; priority: string; dueDate: string | null }>;
  progress: Record<string, number>;
  percent: number;
  total: number;
  done: number;
  publicActivity: Array<{
    task_name: string;
    action: string;
    payload: Record<string, string>;
    created_at: string;
  }>;
  lastUpdated: string | null;
}

const STATUS_ORDER = ["⚡ In Progress", "🚀 Ready", "🧭 Planning", "👀 Review", "⏸ Blocked", "📥 Inbox", "✅ Done"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function PortalPage() {
  const params = useParams();
  const projectId = params.project_id as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    // Decode if base64
    let id = projectId;
    try {
      const decoded = atob(projectId);
      if (decoded.startsWith("rec")) id = decoded;
    } catch {}

    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/portal-get-project?project_id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("No se pudo cargar el proyecto"))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <div className="text-muted text-sm">Cargando...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f6" }}>
        <div className="text-center p-8">
          <div className="text-2xl mb-3">🌊</div>
          <div className="text-sm text-muted">{error || "Proyecto no encontrado"}</div>
        </div>
      </div>
    );
  }

  const grouped: Record<string, typeof data.tasks> = {};
  for (const t of data.tasks) {
    const key = t.status;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }
  const orderedStatuses = STATUS_ORDER.filter((s) => grouped[s]?.length > 0);

  return (
    <div className="min-h-screen" style={{ background: "#faf9f6" }}>
      <div className="max-w-[560px] mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-muted uppercase tracking-wider">SWELLS LAB · Portal de cliente</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight mb-2">{data.project.name}</h1>
          {data.project.description && (
            <p className="text-sm text-muted leading-relaxed">{data.project.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white border-[0.5px] border-black/8 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Progreso general</span>
            <span className="text-2xl font-medium">{data.percent}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${data.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{data.done} completadas de {data.total}</span>
            {data.lastUpdated && (
              <span>Última actualización: {timeAgo(data.lastUpdated)}</span>
            )}
          </div>
        </div>

        {/* Task breakdown */}
        {orderedStatuses.map((status) => (
          <div key={status} className="mb-5">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 px-1">
              {status} ({grouped[status].length})
            </h3>
            <div className="space-y-2">
              {grouped[status].map((t) => (
                <div key={t.id} className="bg-white border-[0.5px] border-black/8 rounded-lg p-3">
                  <div className="text-sm font-medium">{t.name}</div>
                  {t.dueDate && (
                    <div className="text-xs text-muted mt-1">📅 {formatDate(t.dueDate)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Recent activity */}
        {data.publicActivity.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Actividad reciente
            </h3>
            <div className="space-y-2">
              {data.publicActivity.map((a, i) => (
                <div key={i} className="bg-white border-[0.5px] border-black/8 rounded-lg p-3">
                  <div className="text-sm font-medium">{a.task_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {a.action === "status_change" && (
                      <>{a.payload.from} → {a.payload.to}</>
                    )}
                    {a.action === "checkin" && (
                      <>📸 Avance reportado {a.payload.caption ? `· ${a.payload.caption}` : ""}</>
                    )}
                    {" · "}{timeAgo(a.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-xs text-muted">
          Powered by SWELLS LAB 🌊
        </div>
      </div>
    </div>
  );
}
