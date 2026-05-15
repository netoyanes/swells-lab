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

    const userSupa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userSupa.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { task_id, task_name, action, payload, photo_base64, photo_filename, photo_type } = body;

    let photo_url: string | null = null;

    // Upload photo if present
    if (photo_base64 && photo_filename) {
      const bytes = Uint8Array.from(atob(photo_base64), c => c.charCodeAt(0));
      const path = `${task_id}/${Date.now()}_${photo_filename}`;
      const { data: upload, error: uploadErr } = await supa.storage
        .from("task-files")
        .upload(path, bytes, { contentType: photo_type || "image/jpeg", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supa.storage.from("task-files").getPublicUrl(path);
      photo_url = publicUrl;

      // Save to task_files table
      await supa.from("task_files").insert({
        task_id,
        user_id: user.id,
        file_name: photo_filename,
        file_url: photo_url,
        file_type: photo_type || "image/jpeg",
        caption: payload?.caption || null,
        latitude: payload?.latitude || null,
        longitude: payload?.longitude || null,
      });
    }

    // Insert activity log
    const finalPayload = photo_url ? { ...payload, photo_url } : payload;
    const { data: activity, error: actErr } = await supa.from("activity_log").insert({
      task_id,
      user_id: user.id,
      action,
      payload: finalPayload,
    }).select().single();
    if (actErr) throw actErr;

    // Get member info for notifications
    const { data: member } = await supa.from("members")
      .select("name").eq("user_id", user.id).single();

    // Create notifications for assignees (if comment or checkin)
    if (["comment", "checkin", "status_change"].includes(action) && body.assignee_ids?.length) {
      const notifMsg =
        action === "comment" ? `${member?.name} comentó en '${task_name}'` :
        action === "checkin" ? `${member?.name} reportó avance en '${task_name}'` :
        `${member?.name} movió '${task_name}' a ${finalPayload?.to}`;

      const notifs = body.assignee_ids
        .filter((uid: string) => uid !== user.id)
        .map((uid: string) => ({
          user_id: uid,
          type: action === "comment" ? "comment" : action === "checkin" ? "checkin" : "status_change",
          task_id,
          task_name,
          from_user_name: member?.name,
          message: notifMsg,
        }));
      if (notifs.length > 0) await supa.from("notifications").insert(notifs);
    }

    return new Response(JSON.stringify({ activity, photo_url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
