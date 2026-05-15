export type TaskStatus =
  | "📥 Inbox"
  | "🧭 Planning"
  | "🚀 Ready"
  | "⚡ In Progress"
  | "⏸ Blocked"
  | "👀 Review"
  | "✅ Done"
  | "🗄 Archived";

export type TaskPriority = "🔴 Urgent" | "🟠 High" | "🟡 Medium" | "🟢 Low";
export type TaskEnergy = "⚡ High" | "🌤 Medium" | "🌙 Low";
export type TaskArea =
  | "Marketing"
  | "OPS"
  | "Business Model"
  | "Ventas"
  | "Comunicación"
  | "Estrategia"
  | "Producto"
  | "Onboarding"
  | "Investigación";

export interface Attachment {
  id: string;
  url: string;
  filename: string;
  type: string;
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  area: TaskArea[];
  brief: string;
  notes: string;
  projectIds: string[];
  dueDate: string | null;
  energy: TaskEnergy | null;
  attachments: Attachment[];
  assignees?: string[];
  assigneeNames?: string;
}

export type ProjectType =
  | "Initiative"
  | "Client"
  | "Personal Brand"
  | "Sub-project"
  | "Operations";

export type ProjectStatus = "Active" | "Planning" | "On Hold" | "Completed";
export type ProjectPriority = "High" | "Medium" | "Low";

export interface Project {
  id: string;
  name: string;
  type: ProjectType | "";
  status: ProjectStatus | "";
  priority: ProjectPriority | "";
  description: string;
  parentIds: string[];
}

export const STATUS_OPTS: TaskStatus[] = [
  "📥 Inbox",
  "🧭 Planning",
  "🚀 Ready",
  "⚡ In Progress",
  "⏸ Blocked",
  "👀 Review",
  "✅ Done",
  "🗄 Archived",
];

export const PRIORITY_OPTS: TaskPriority[] = [
  "🔴 Urgent",
  "🟠 High",
  "🟡 Medium",
  "🟢 Low",
];

export const ENERGY_OPTS: TaskEnergy[] = ["⚡ High", "🌤 Medium", "🌙 Low"];

export const AREA_OPTS: TaskArea[] = [
  "Marketing",
  "OPS",
  "Business Model",
  "Ventas",
  "Comunicación",
  "Estrategia",
  "Producto",
  "Onboarding",
  "Investigación",
];

// Extended Task with assignees (user_ids from Supabase)
export interface TaskWithAssignees extends Task {
  assignees: string[];
  assigneeNames: string;
}

export interface Member {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}

export interface ActivityItem {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  action: "status_change" | "priority_change" | "comment" | "checkin" | "assignment" | "file_upload" | "created";
  payload: {
    from?: string;
    to?: string;
    message?: string;
    photo_url?: string;
    caption?: string;
    latitude?: number;
    longitude?: number;
    assigned_to?: string[];
    assigned_to_names?: string;
    filename?: string;
  };
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: "assigned" | "comment" | "status_change" | "checkin";
  task_id: string | null;
  task_name: string | null;
  from_user_name: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Invite {
  code: string;
  role: string;
  created_at: string;
  expires_at: string;
  used_by: string | null;
}
