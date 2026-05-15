import type { Task, TaskPriority, TaskStatus } from "./types";

export function statusClass(s: TaskStatus | string): string {
  if (s.includes("Inbox")) return "bg-sInbox-bg text-sInbox-fg";
  if (s.includes("Planning")) return "bg-sPlanning-bg text-sPlanning-fg";
  if (s.includes("Ready")) return "bg-sReady-bg text-sReady-fg";
  if (s.includes("Progress")) return "bg-sProgress-bg text-sProgress-fg";
  if (s.includes("Blocked")) return "bg-sBlocked-bg text-sBlocked-fg";
  if (s.includes("Review")) return "bg-sReview-bg text-sReview-fg";
  if (s.includes("Done")) return "bg-sDone-bg text-sDone-fg";
  return "bg-sArchived-bg text-sArchived-fg";
}

export function priorityClass(p: TaskPriority | string): string {
  if (p.includes("Urgent")) return "bg-pUrgent-bg text-pUrgent-fg";
  if (p.includes("High")) return "bg-pHigh-bg text-pHigh-fg";
  if (p.includes("Medium")) return "bg-pMedium-bg text-pMedium-fg";
  return "bg-pLow-bg text-pLow-fg";
}

export function priorityOrder(p: TaskPriority): number {
  if (p.includes("Urgent")) return 0;
  if (p.includes("High")) return 1;
  if (p.includes("Medium")) return 2;
  return 3;
}

export function formatDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "📅 Hoy";
  if (diff === 1) return "📅 Mañana";
  if (diff < 0) return `⚠️ Vencido ${Math.abs(diff)}d`;
  if (diff < 7) return `📅 En ${diff}d`;
  return `📅 ${date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
}

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = priorityOrder(a.priority) - priorityOrder(b.priority);
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

export function isOpen(t: Task): boolean {
  return !t.status.includes("Done") && !t.status.includes("Archived");
}

export function haptic() {
  try {
    if (typeof window !== "undefined" && "vibrate" in window.navigator) {
      window.navigator.vibrate(10);
    }
  } catch {}
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
