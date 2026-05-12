// supabase/functions/invite-create/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function randomCode(len = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: cors });

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is owner or admin
    const { data: caller } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!caller || !["owner", "admin"].includes(caller.role)) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    const body = await req.json();
    const role = body.role || "member";
    const code = randomCode();

    const { error } = await supabase.from("invites").insert({
      code,
      role,
      created_by: user.id,
    });

    if (error) throw error;

    const appUrl = Deno.env.get("APP_URL") || "https://swells-lab.vercel.app";
    const inviteUrl = `${appUrl}/invite/${code}`;

    return new Response(JSON.stringify({ code, inviteUrl, role }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
