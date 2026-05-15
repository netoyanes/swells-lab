// supabase/functions/task-assign/index.ts
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

    const { task_id, user_ids, task_name } = await req.json();
    if (!task_id || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: "Missing task_id or user_ids" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Get member info for assignees
    const { data: assigneeMembers } = await serviceSupabase
      .from("members")
      .select("user_id, name")
      .in("user_id", user_ids);

    const assigneeNames = (assigneeMembers || []).map((m: any) => m.name).join(", ");
    const assigneesStr = user_ids.join(",");

    // Update Airtable
    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tableId = Deno.env.get("AIRTABLE_TASKS_TABLE")!;

    const airtableRes = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${task_id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          "Assignees": assigneesStr,
          "Assignee Names": assigneeNames,
        },
      }),
    });

    if (!airtableRes.ok) {
      const t = await airtableRes.text();
      throw new Error(`Airtable ${airtableRes.status}: ${t}`);
    }

    // Get existing assignments to find newly added
    const { data: existing } = await serviceSupabase
      .from("task_assignments")
      .select("user_id")
      .eq("task_id", task_id);
    const existingIds = new Set((existing || []).map((a: any) => a.user_id));

    // Delete removed assignments
    if (existing && existing.length > 0) {
      const toRemove = (existing || [])
        .filter((a: any) => !user_ids.includes(a.user_id))
        .map((a: any) => a.user_id);
      if (toRemove.length > 0) {
        await serviceSupabase
          .from("task_assignments")
          .delete()
          .eq("task_id", task_id)
          .in("user_id", toRemove);
      }
    }

    // Upsert new assignments
    if (user_ids.length > 0) {
      await serviceSupabase.from("task_assignments").upsert(
        user_ids.map((uid: string) => ({
          task_id,
          user_id: uid,
          assigned_by: user.id,
        })),
        { onConflict: "task_id,user_id" }
      );
    }

    // Log assignment activity
    const { data: assigner } = await serviceSupabase
      .from("members")
      .select("name")
      .eq("user_id", user.id)
      .single();

    await serviceSupabase.from("activity_log").insert({
      task_id,
      user_id: user.id,
      action: "assignment",
      payload: {
        assigned_to: user_ids,
        assigned_to_names: assigneeNames,
        assigned_by: user.id,
      },
    });

    // Notify newly assigned users
    const newlyAssigned = user_ids.filter((uid: string) => !existingIds.has(uid) && uid !== user.id);
    if (newlyAssigned.length > 0) {
      await serviceSupabase.from("notifications").insert(
        newlyAssigned.map((uid: string) => ({
          user_id: uid,
          type: "assigned",
          task_id,
          task_name: task_name || task_id,
          from_user_name: assigner?.name || "Alguien",
          message: `📋 ${assigner?.name || "Alguien"} te asignó '${task_name || task_id}'`,
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, assignees: user_ids, assigneeNames }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
