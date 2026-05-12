// supabase/functions/airtable-list-tasks/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tableId = Deno.env.get("AIRTABLE_TASKS_TABLE")!;

    const records: any[] = [];
    let offset: string | undefined;
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${pat}` },
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(
          JSON.stringify({ error: `Airtable ${r.status}: ${t}` }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      const data = await r.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);

    return new Response(JSON.stringify({ records: records.map(mapTask) }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

function mapTask(r: any) {
  const f = r.fields || {};
  return {
    id: r.id,
    name: f["Task Name"] || "",
    status: f["Status"] || "📥 Inbox",
    priority: f["Priority"] || "🟡 Medium",
    area: f["Area"] || [],
    brief: f["Brief / Context"] || "",
    notes: f["Sub-tasks / Notes"] || "",
    projectIds: f["Project"] || [],
    dueDate: f["Due Date"] || null,
    energy: f["Energy"] || null,
    assignees: (f["Assignees"] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    assigneeNames: f["Assignee Names"] || "",
    attachments: (f["Attachments"] || []).map((a: any) => ({
      id: a.id,
      url: a.url,
      filename: a.filename,
      type: a.type,
    })),
  };
}
