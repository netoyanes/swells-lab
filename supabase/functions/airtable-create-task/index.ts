// supabase/functions/airtable-create-task/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELD_MAP: Record<string, string> = {
  name: "Task Name",
  status: "Status",
  priority: "Priority",
  area: "Area",
  brief: "Brief / Context",
  notes: "Sub-tasks / Notes",
  projectIds: "Project",
  dueDate: "Due Date",
  energy: "Energy",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return new Response("Unauthorized", { status: 401, headers: cors });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response("Unauthorized", { status: 401, headers: cors });

    const { fields } = await req.json();
    if (!fields || !fields.name) {
      return new Response(JSON.stringify({ error: "Missing name" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const airtableFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      const mapped = FIELD_MAP[k];
      if (mapped) airtableFields[mapped] = v;
    }

    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tableId = Deno.env.get("AIRTABLE_TASKS_TABLE")!;

    const r = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: airtableFields }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(
        JSON.stringify({ error: `Airtable ${r.status}: ${t}` }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const data = await r.json();
    return new Response(
      JSON.stringify({
        record: {
          id: data.id,
          name: data.fields["Task Name"] || "",
          status: data.fields["Status"] || "📥 Inbox",
          priority: data.fields["Priority"] || "🟡 Medium",
          area: data.fields["Area"] || [],
          brief: data.fields["Brief / Context"] || "",
          notes: data.fields["Sub-tasks / Notes"] || "",
          projectIds: data.fields["Project"] || [],
          dueDate: data.fields["Due Date"] || null,
          energy: data.fields["Energy"] || null,
          attachments: data.fields["Attachments"] || [],
        },
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
