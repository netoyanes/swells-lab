// supabase/functions/send-weekly-digest/index.ts
// deno-lint-ignore-file no-explicit-any
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
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://swells-lab.vercel.app";

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(weekStart.getDate() - 1);

    // Get all members with email
    const { data: members } = await serviceSupabase
      .from("members")
      .select("user_id, name, email")
      .not("email", "is", null);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch tasks from Airtable
    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tableId = Deno.env.get("AIRTABLE_TASKS_TABLE")!;

    const records: any[] = [];
    let offset: string | undefined;
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);
      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${pat}` },
      });
      const data = await r.json();
      records.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    const lastWeekEndStr = lastWeekEnd.toISOString().split("T")[0];

    const formatDateEs = (d: string) => {
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" });
    };

    let sent = 0;
    for (const member of members) {
      const myTasks = records.filter((r: any) => {
        const assignees = (r.fields["Assignees"] || "").split(",").map((s: string) => s.trim());
        return assignees.includes(member.user_id);
      });

      const thisWeek = myTasks.filter((r: any) => {
        const due = r.fields["Due Date"];
        return due && due >= weekStartStr && due <= weekEndStr && !r.fields["Status"]?.includes("Done");
      });

      const urgent = myTasks.filter((r: any) =>
        r.fields["Priority"]?.includes("Urgent") && !r.fields["Status"]?.includes("Done") && !r.fields["Due Date"]
      );

      // Get completed last week from activity log
      const { data: completedActivities } = await serviceSupabase
        .from("activity_log")
        .select("task_id, payload, created_at")
        .eq("user_id", member.user_id)
        .eq("action", "status_change")
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString());

      const completedTaskIds = new Set(
        (completedActivities || [])
          .filter((a: any) => a.payload?.to?.includes("Done"))
          .map((a: any) => a.task_id)
      );
      const completedLastWeek = myTasks.filter((r: any) => completedTaskIds.has(r.id));

      const dateStr = now.toLocaleDateString("es-MX", { day: "numeric", month: "long" });

      const thisWeekLines = thisWeek.map((r: any) =>
        `• ${r.fields["Task Name"]} — vence ${formatDateEs(r.fields["Due Date"])} — ${r.fields["Status"]}`
      ).join("\n") || "— Sin tareas con fecha esta semana";

      const completedLines = completedLastWeek.map((r: any) =>
        `• ${r.fields["Task Name"]}`
      ).join("\n") || "— Ninguna";

      const urgentLines = urgent.map((r: any) =>
        `• ${r.fields["Task Name"]}`
      ).join("\n") || "— Sin urgentes";

      const body = `Hola ${member.name} 👋

📅 ESTA SEMANA
${thisWeekLines}

✅ COMPLETASTE LA SEMANA PASADA
${completedLines}

🔴 URGENTE SIN FECHA
${urgentLines}

Ver todas tus tareas → ${appUrl}

—
SWELLS LAB`;

      if (resendApiKey && member.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SWELLS LAB <noreply@swells-lab.vercel.app>",
            to: [member.email],
            subject: `SWELLS LAB — Tu semana del ${dateStr}`,
            text: body,
          }),
        });
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent, members: members.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
