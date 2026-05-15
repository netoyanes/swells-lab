// supabase/functions/activity-create/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { task_id, task_name, action, payload = {}, photo_base64, photo_filename, photo_type } = body;

    if (!task_id || !action) {
      return new Response(JSON.stringify({ error: "Missing task_id or action" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let finalPayload = { ...payload };

    // Handle photo upload
    if (photo_base64 && photo_filename) {
      const byteString = atob(photo_base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);

      const timestamp = Date.now();
      const path = `${task_id}/${timestamp}_${photo_filename}`;
      const { error: uploadError } = await serviceSupabase.storage
        .from("task-files")
        .upload(path, bytes, { contentType: photo_type || "image/jpeg" });

      if (!uploadError) {
        const { data: urlData } = serviceSupabase.storage.from("task-files").getPublicUrl(path);
        finalPayload.photo_url = urlData.publicUrl;

        await serviceSupabase.from("task_files").insert({
          task_id,
          user_id: user.id,
          file_name: photo_filename,
          file_url: urlData.publicUrl,
          file_type: photo_type || "image/jpeg",
          file_size: bytes.length,
          caption: payload.caption || null,
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
        });
      }
    }

    // Insert activity log
    const { data: activity, error: activityError } = await serviceSupabase
      .from("activity_log")
      .insert({
        task_id,
        user_id: user.id,
        action,
        payload: finalPayload,
      })
      .select()
      .single();

    if (activityError) throw activityError;

    // Get user info for response
    const { data: member } = await serviceSupabase
      .from("members")
      .select("name, avatar_url")
      .eq("user_id", user.id)
      .single();

    // Create notifications for assignees (exclude self)
    if (task_id && ["comment", "checkin", "status_change"].includes(action)) {
      const { data: assignments } = await serviceSupabase
        .from("task_assignments")
        .select("user_id")
        .eq("task_id", task_id)
        .neq("user_id", user.id);

      if (assignments && assignments.length > 0) {
        const userName = member?.name || "Alguien";
        const tName = task_name || task_id;
        const notifMap: Record<string, string> = {
          comment: `💬 ${userName} comentó en '${tName}'`,
          checkin: `📸 ${userName} reportó avance en '${tName}'`,
          status_change: `🔄 ${userName} movió '${tName}' a ${finalPayload.to || ""}`,
        };
        const message = notifMap[action] || `${userName} actualizó '${tName}'`;

        await serviceSupabase.from("notifications").insert(
          assignments.map((a: any) => ({
            user_id: a.user_id,
            type: action === "comment" ? "comment" : action === "checkin" ? "checkin" : "status_change",
            task_id,
            task_name: tName,
            from_user_name: userName,
            message,
          }))
        );
      }
    }

    return new Response(JSON.stringify({
      activity: {
        ...activity,
        user_name: member?.name || "",
        user_avatar: member?.avatar_url || null,
      },
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
