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

    const { task_id, task_name, user_ids } = await req.json();

    // Get member names
    const { data: members } = await supa.from("members")
      .select("user_id, name").in("user_id", user_ids);
    const nameMap = Object.fromEntries((members || []).map(m => [m.user_id, m.name]));
    const names = user_ids.map((id: string) => nameMap[id] || id).join(", ");

    // Update Airtable
    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tableId = Deno.env.get("AIRTABLE_TASKS_TABLE")!;
    await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${task_id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { "Assignees": user_ids.join(","), "Assignee Names": names } }),
    });

    // Upsert task_assignments
    const rows = user_ids.map((uid: string) => ({
      task_id, user_id: uid, assigned_by: user.id
    }));
    await supa.from("task_assignments").upsert(rows, { onConflict: "task_id,user_id" });

    // Get assigner name
    const { data: assigner } = await supa.from("members")
      .select("name").eq("user_id", user.id).single();

    // Notifications for newly assigned users
    const notifs = user_ids.filter((uid: string) => uid !== user.id).map((uid: string) => ({
      user_id: uid,
      type: "assigned",
      task_id,
      task_name,
      from_user_name: assigner?.name,
      message: `${assigner?.name} te asignó '${task_name}'`,
    }));
    if (notifs.length > 0) await supa.from("notifications").insert(notifs);

    // Log activity
    await supa.from("activity_log").insert({
      task_id, user_id: user.id, action: "assignment",
      payload: { assigned_to: user_ids, assigned_names: names },
    });

    return new Response(JSON.stringify({ success: true, assignee_names: names }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
