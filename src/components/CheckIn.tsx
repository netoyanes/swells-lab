"use client";

import { useRef, useState } from "react";
import { useCreateActivity } from "@/lib/queries";
import { useToast } from "./Toast";

interface Props {
  taskId: string;
  taskName: string;
  onDone: () => void;
}

export function CheckIn({ taskId, taskName, onDone }: Props) {
  const [phase, setPhase] = useState<"idle" | "preview" | "uploading">("idle");
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<{ base64: string; name: string; type: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const createActivity = useCreateActivity();
  const toast = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast("⚠ Imagen muy grande (máx 10MB)"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setPreviewUrl(result);
      setPhotoData({ base64, name: file.name, type: file.type });
      setPhase("preview");
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setPhase("uploading");
    setProgress(20);

    let lat: number | undefined, lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* geolocation optional */ }

    setProgress(50);

    try {
      await createActivity.mutateAsync({
        task_id: taskId,
        task_name: taskName,
        action: "checkin",
        payload: { caption: caption.trim() || undefined, latitude: lat, longitude: lng },
        photo_base64: photoData?.base64,
        photo_filename: photoData?.name,
        photo_type: photoData?.type,
      });
      setProgress(100);
      toast("✓ Avance reportado");
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
          className="w-full py-3 bg-ink text-white rounded-md text-[13px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          📸 Reportar avance
        </button>
      </>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="w-full py-3 bg-sand rounded-md text-[13px] text-center">
        <div className="mb-2 text-muted">Subiendo foto...</div>
        <div className="h-1 bg-hairline rounded-full overflow-hidden mx-4">
          <div
            className="h-full bg-ink rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-[0.5px] border-hairline rounded-lg overflow-hidden">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="preview" className="w-full max-h-48 object-cover" />
      )}
      <div className="p-3">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption opcional..."
          rows={2}
          className="w-full p-2 bg-sand rounded-md text-[13px] resize-none border-[0.5px] border-hairline focus:outline-none focus:border-ink mb-2"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setPhase("idle"); setPreviewUrl(null); setPhotoData(null); setCaption(""); }}
            className="flex-1 py-2.5 bg-sand text-muted rounded-md text-[12px] font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 bg-ink text-white rounded-md text-[12px] font-medium active:scale-95 transition-transform"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
