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

    // Only owner can change roles
    const { data: caller } = await supa.from("members")
      .select("role").eq("user_id", user.id).single();
    if (caller?.role !== "owner") return new Response("Forbidden", { status: 403, headers: cors });

    const { target_user_id, role } = await req.json();
    const validRoles = ["owner", "admin", "member", "viewer"];
    if (!validRoles.includes(role)) return new Response("Invalid role", { status: 400, headers: cors });

    const { data: member, error } = await supa.from("members")
      .update({ role })
      .eq("user_id", target_user_id)
      .select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ member }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
