// supabase/functions/portal-get-project/index.ts
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
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const project_id = url.searchParams.get("project_id");
    if (!project_id) {
      return new Response(JSON.stringify({ error: "Missing project_id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const projectsTable = Deno.env.get("AIRTABLE_PROJECTS_TABLE")!;
    const tasksTable = Deno.env.get("AIRTABLE_TASKS_TABLE")!;

    // Fetch project
    const projRes = await fetch(`https://api.airtable.com/v0/${baseId}/${projectsTable}/${project_id}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!projRes.ok) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const projData = await projRes.json();
    const pf = projData.fields || {};

    const project = {
      id: projData.id,
      name: pf["Project Name"] || "",
      description: pf["Description"] || "",
      status: pf["Status"] || "",
      type: pf["Type"] || "",
    };

    // Fetch tasks linked to this project
    const records: any[] = [];
    let offset: string | undefined;
    do {
      const tasksUrl = new URL(`https://api.airtable.com/v0/${baseId}/${tasksTable}`);
      tasksUrl.searchParams.set("pageSize", "100");
      tasksUrl.searchParams.set("filterByFormula", `FIND("${project_id}", ARRAYJOIN({Project}, ","))`);
      if (offset) tasksUrl.searchParams.set("offset", offset);
      const r = await fetch(tasksUrl.toString(), {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const data = await r.json();
      records.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    // Only return safe public fields (no assignees, no briefs, no notes)
    const tasks = records
      .filter((r: any) => !r.fields["Status"]?.includes("Archived"))
      .map((r: any) => ({
        id: r.id,
        name: r.fields["Task Name"] || "",
        status: r.fields["Status"] || "📥 Inbox",
        priority: r.fields["Priority"] || "🟡 Medium",
        dueDate: r.fields["Due Date"] || null,
      }));

    // Progress breakdown
    const statuses = ["📥 Inbox", "🧭 Planning", "🚀 Ready", "⚡ In Progress", "⏸ Blocked", "👀 Review", "✅ Done"];
    const progress: Record<string, number> = {};
    for (const s of statuses) {
      progress[s] = tasks.filter((t: any) => t.status === s).length;
    }
    const done = tasks.filter((t: any) => t.status.includes("Done")).length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    // Recent public activity (status changes only)
    const { data: recentActivity } = await serviceSupabase
      .from("activity_log")
      .select("task_id, action, payload, created_at")
      .in("action", ["status_change", "checkin"])
      .order("created_at", { ascending: false })
      .limit(10);

    // Filter to only this project's tasks
    const taskIds = new Set(tasks.map((t: any) => t.id));
    const publicActivity = (recentActivity || [])
      .filter((a: any) => taskIds.has(a.task_id))
      .map((a: any) => {
        const task = tasks.find((t: any) => t.id === a.task_id);
        return {
          task_name: task?.name || "",
          action: a.action,
          payload: a.action === "status_change" ? { from: a.payload?.from, to: a.payload?.to } : { caption: a.payload?.caption },
          created_at: a.created_at,
        };
      });

    const lastUpdated = recentActivity?.[0]?.created_at || null;

    return new Response(JSON.stringify({
      project,
      tasks,
      progress,
      percent,
      total,
      done,
      publicActivity,
      lastUpdated,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
