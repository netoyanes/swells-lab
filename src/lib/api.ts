import { supabase } from "./supabase";
import type { Task, Project, ActivityItem, AppNotification, Member } from "./types";

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

export async function listActivity(taskId: string): Promise<{ activities: ActivityItem[] }> {
  return callEdge(`activity-list?task_id=${encodeURIComponent(taskId)}`);
}

export async function createActivity(params: {
  task_id: string;
  task_name?: string;
  action: string;
  payload?: Record<string, unknown>;
  photo_base64?: string;
  photo_filename?: string;
  photo_type?: string;
}): Promise<{ activity: ActivityItem }> {
  return callEdge("activity-create", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function assignTask(params: {
  task_id: string;
  user_ids: string[];
  task_name?: string;
}): Promise<{ success: boolean; assignees: string[]; assigneeNames: string }> {
  return callEdge("task-assign", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listNotifications(): Promise<{ notifications: AppNotification[]; unread_count: number }> {
  return callEdge("notifications-list");
}

export async function markNotificationsRead(): Promise<{ success: boolean }> {
  return callEdge("notifications-mark-read", { method: "POST", body: "{}" });
}

export async function updateMemberRole(params: {
  user_id: string;
  role: string;
}): Promise<{ member: Member }> {
  return callEdge("member-update-role", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
