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
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pat = Deno.env.get("AIRTABLE_PAT")!;
    const baseId = Deno.env.get("AIRTABLE_BASE_ID")!;
    const tasksTable = Deno.env.get("AIRTABLE_TASKS_TABLE")!;
    const appUrl = Deno.env.get("APP_URL") || "https://swells-lab.vercel.app";

    // Get all members
    const { data: members } = await supa.from("members").select("*");
    if (!members?.length) return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

    // Fetch all tasks from Airtable
    const tasksRes = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tasksTable}?pageSize=100`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    const tasksData = await tasksRes.json();
    const allTasks = (tasksData.records || []).map((r: any) => ({
      id: r.id,
      name: r.fields["Task Name"] || "",
      status: r.fields["Status"] || "",
      priority: r.fields["Priority"] || "",
      dueDate: r.fields["Due Date"] || null,
      assignees: (r.fields["Assignees"] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    }));

    const today = new Date();
    const in7 = new Date(today); in7.setDate(in7.getDate() + 7);

    let sent = 0;
    for (const member of members) {
      const myTasks = allTasks.filter(t => t.assignees.includes(member.user_id));
      const thisWeek = myTasks.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= today && d <= in7 && !t.status.includes("Done");
      });
      const urgent = myTasks.filter(t =>
        t.priority.includes("Urgent") && !t.status.includes("Done") && !t.dueDate
      );
      const inProgress = myTasks.filter(t => t.status.includes("Progress"));

      if (!myTasks.length) continue;

      const dateStr = today.toLocaleDateString("es-MX", { day: "numeric", month: "long" });

      const emailBody = `
Hola ${member.name} 👋

📅 ESTA SEMANA (${thisWeek.length} tareas)
${thisWeek.map(t => `• ${t.name} — vence ${t.dueDate}`).join("\n") || "• Sin tareas con fecha esta semana"}

⚡ EN PROGRESO (${inProgress.length})
${inProgress.map(t => `• ${t.name}`).join("\n") || "• Ninguna"}

🔴 URGENTE SIN FECHA (${urgent.length})
${urgent.map(t => `• ${t.name}`).join("\n") || "• Ninguna"}

Ver todas tus tareas → ${appUrl}

— SWELLS LAB
      `.trim();

      // Send via Supabase Auth email (or Resend if configured)
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "SWELLS LAB <noreply@swells.mx>",
            to: [member.email],
            subject: `SWELLS LAB — Tu semana del ${dateStr}`,
            text: emailBody,
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
