"use client";

import { useRef, useState } from "react";
import type { Member } from "@/lib/types";
import { fileToBase64 } from "@/lib/utils";
import { useCreateActivity } from "@/lib/queries";
import { useToast } from "./Toast";

interface Props {
  taskId: string;
  taskName: string;
  currentUser: Member | null;
}

export function CommentInput({ taskId, taskName, currentUser }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createActivity = useCreateActivity();
  const toast = useToast();

  if (!currentUser) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    e.target.value = "";
  };

  const clearFile = () => {
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const submit = async () => {
    if ((!message.trim() && !pendingFile) || sending) return;
    setSending(true);

    try {
      let photo_base64: string | undefined;
      let photo_filename: string | undefined;
      let photo_type: string | undefined;

      if (pendingFile) {
        photo_base64 = await fileToBase64(pendingFile);
        photo_filename = pendingFile.name;
        photo_type = pendingFile.type;
      }

      await createActivity.mutateAsync({
        task_id: taskId,
        task_name: taskName,
        action: "comment",
        payload: { message: message.trim() || undefined },
        photo_base64,
        photo_filename,
        photo_type,
      });

      setMessage("");
      clearFile();
    } catch {
      toast("⚠ Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="mt-3">
      {/* Photo preview */}
      {previewUrl && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
          <button
            onClick={clearFile}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink text-white rounded-full text-[10px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Avatar */}
        {currentUser.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUser.avatar_url} alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-sand flex items-center justify-center text-[10px] font-medium flex-shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Input */}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Agregar comentario..."
          className="flex-1 px-3 py-2.5 bg-sand rounded-full text-[13px] border-[0.5px] border-hairline focus:outline-none focus:border-ink/30"
        />

        {/* Camera */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center text-muted text-lg rounded-full bg-sand active:bg-soft transition-colors"
          title="Adjuntar foto"
        >
          📷
        </button>

        {/* Send */}
        <button
          onClick={submit}
          disabled={(!message.trim() && !pendingFile) || sending}
          className="w-9 h-9 flex items-center justify-center bg-ink text-white rounded-full text-sm disabled:opacity-40 active:scale-95 transition-transform"
        >
          {sending ? (
            <span className="w-3 h-3 border border-white border-t-transparent rounded-full spinning" />
          ) : (
            "→"
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
