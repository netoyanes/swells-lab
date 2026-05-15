// supabase/functions/member-update-role/index.ts
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

    // Verify caller is owner
    const { data: caller } = await serviceSupabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!caller || caller.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owners can change roles" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { user_id, role } = await req.json();
    if (!user_id || !role) {
      return new Response(JSON.stringify({ error: "Missing user_id or role" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["owner", "admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: member, error } = await serviceSupabase
      .from("members")
      .update({ role })
      .eq("user_id", user_id)
      .select()
      .single();

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
