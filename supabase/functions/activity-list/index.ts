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

    const url = new URL(req.url);
    const task_id = url.searchParams.get("task_id");
    if (!task_id) return new Response(JSON.stringify({ error: "task_id required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });

    const { data: activities, error } = await supa
      .from("activity_log")
      .select("*")
      .eq("task_id", task_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    // Join member info
    const { data: members } = await supa.from("members").select("user_id, name, avatar_url");
    const memberMap = Object.fromEntries((members || []).map(m => [m.user_id, m]));

    const enriched = (activities || []).map(a => ({
      ...a,
      user_name: memberMap[a.user_id]?.name || "Unknown",
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
