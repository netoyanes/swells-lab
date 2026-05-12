import { supabase } from "./supabase";
import type { Task, Project } from "./types";

async function callEdge<T>(fn: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fn}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${fn} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listTasks(): Promise<{ records: Task[] }> {
  return callEdge("airtable-list-tasks");
}

export async function listProjects(): Promise<{ records: Project[] }> {
  return callEdge("airtable-list-projects");
}

export async function updateTask(
  taskId: string,
  fields: Partial<Task>
): Promise<{ record: Task }> {
  return callEdge("airtable-update-task", {
    method: "POST",
    body: JSON.stringify({ taskId, fields }),
  });
}

export async function createTask(
  fields: Partial<Task>
): Promise<{ record: Task }> {
  return callEdge("airtable-create-task", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}
