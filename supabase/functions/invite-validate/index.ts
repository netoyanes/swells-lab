// supabase/functions/invite-validate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return new Response(JSON.stringify({ valid: false, error: "No code" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invite, error } = await supabase
      .from("invites")
      .select("code, role, used_by, expires_at")
      .eq("code", code)
      .single();

    if (error || !invite) {
      return new Response(JSON.stringify({ valid: false, error: "Invite not found" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (invite.used_by) {
      return new Response(JSON.stringify({ valid: false, error: "Invite already used" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Invite expired" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true, role: invite.role, code: invite.code }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
