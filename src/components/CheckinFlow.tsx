"use client";

import { useRef, useState } from "react";
import { fileToBase64 } from "@/lib/utils";
import { useCreateActivity } from "@/lib/queries";
import { useToast } from "./Toast";

interface Props {
  taskId: string;
  taskName: string;
  onDone: () => void;
}

export function CheckinFlow({ taskId, taskName, onDone }: Props) {
  const [phase, setPhase] = useState<"idle" | "preview" | "uploading">("idle");
  const [caption, setCaption] = useState("");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const createActivity = useCreateActivity();
  const toast = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast("⚠ Imagen muy grande (máx 15MB)"); return; }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPhase("preview");
    e.target.value = "";
  };

  const cancel = () => {
    setPhase("idle");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    setIncludeLocation(false);
    setProgress(0);
  };

  const publish = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(15);

    let lat: number | undefined, lng: number | undefined;
    if (includeLocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* location optional */ }
    }

    setProgress(40);

    try {
      const photo_base64 = await fileToBase64(file);
      setProgress(65);

      await createActivity.mutateAsync({
        task_id: taskId,
        task_name: taskName,
        action: "checkin",
        payload: {
          caption: caption.trim() || undefined,
          latitude: lat,
          longitude: lng,
        },
        photo_base64,
        photo_filename: file.name,
        photo_type: file.type,
      });

      setProgress(100);
      toast("✓ Avance publicado");
      cancel();
      onDone();
    } catch {
      toast("⚠ Error al subir");
      setPhase("preview");
      setProgress(0);
    }
  };

  if (phase === "idle") {
    return (
      <>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 bg-ink text-white rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          📸 Reportar avance
        </button>
      </>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="w-full py-4 bg-sand rounded-lg text-center">
        <div className="text-[13px] text-muted mb-3">Subiendo avance...</div>
        <div className="h-1.5 bg-hairline rounded-full overflow-hidden mx-6">
          <div
            className="h-full bg-ink rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-[0.5px] border-hairline rounded-xl overflow-hidden fade-in">
      {/* Photo preview */}
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="preview" className="w-full max-h-64 object-cover" />
      )}

      <div className="p-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Agregar descripción... (opcional)"
          rows={2}
          className="w-full p-2.5 bg-sand rounded-lg text-[13px] resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink/30 mb-3"
        />

        {/* Location toggle */}
        <button
          onClick={() => setIncludeLocation(!includeLocation)}
          className={`flex items-center gap-2 text-[12px] mb-4 ${includeLocation ? "text-ink" : "text-muted"}`}
        >
          <div className={`w-9 h-5 rounded-full transition-colors relative ${includeLocation ? "bg-ink" : "bg-sand border border-hairline"}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeLocation ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          📍 Incluir ubicación
        </button>

        <div className="flex gap-2">
          <button
            onClick={cancel}
            className="flex-1 py-2.5 bg-sand text-muted rounded-lg text-[13px] font-medium active:scale-[0.97] transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={publish}
            className="flex-1 py-2.5 bg-ink text-white rounded-lg text-[13px] font-medium active:scale-[0.97] transition-transform"
          >
            Publicar avance
          </button>
        </div>
      </div>
    </div>
  );
}
