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
