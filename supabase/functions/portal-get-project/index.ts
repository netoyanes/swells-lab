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
    const url = new URL(req.url);
    const project_id = url.searchParams.get("project_id");
    if (!project_id) return new Response(JSON.stringify({ error: "project_id required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });

    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tasksTable = Deno.env.get("AIRTABLE_TASKS_TABLE")!;
    const projectsTable = Deno.env.get("AIRTABLE_PROJECTS_TABLE")!;

    // Fetch project
    const projRes = await fetch(`https://api.airtable.com/v0/${baseId}/${projectsTable}/${project_id}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!projRes.ok) return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
    const proj = await projRes.json();

    // Fetch tasks for this project
    const tasksRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tasksTable}?filterByFormula=FIND("${project_id}",ARRAYJOIN({Project}))&pageSize=100`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    const tasksData = await tasksRes.json();

    // Return only safe public fields
    const tasks = (tasksData.records || []).map((r: any) => ({
      id: r.id,
      name: r.fields["Task Name"] || "",
      status: r.fields["Status"] || "",
      priority: r.fields["Priority"] || "",
      dueDate: r.fields["Due Date"] || null,
    }));

    const statusCounts = tasks.reduce((acc: any, t: any) => {
      const key = t.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return new Response(JSON.stringify({
      project: {
        id: proj.id,
        name: proj.fields["Project Name"] || "",
        description: proj.fields["Description"] || "",
        status: proj.fields["Status"] || "",
      },
      tasks,
      statusCounts,
      total: tasks.length,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
