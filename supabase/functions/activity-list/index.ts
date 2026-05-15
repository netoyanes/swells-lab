// supabase/functions/activity-list/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    const url = new URL(req.url);
    const task_id = url.searchParams.get("task_id");
    if (!task_id) {
      return new Response(JSON.stringify({ error: "Missing task_id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: activities, error } = await serviceSupabase
      .from("activity_log")
      .select("*")
      .eq("task_id", task_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch member info for all unique user_ids
    const userIds = [...new Set(activities?.map((a: any) => a.user_id).filter(Boolean))];
    const { data: membersData } = await serviceSupabase
      .from("members")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const memberMap: Record<string, any> = {};
    for (const m of (membersData || [])) memberMap[m.user_id] = m;

    const enriched = (activities || []).map((a: any) => ({
      ...a,
      user_name: memberMap[a.user_id]?.name || "",
      user_avatar: memberMap[a.user_id]?.avatar_url || null,
    }));

    return new Response(JSON.stringify({ activities: enriched }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
