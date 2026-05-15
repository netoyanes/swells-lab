"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignTask,
  createActivity,
  createTask,
  listActivity,
  listNotifications,
  listProjects,
  listTasks,
  markNotificationsRead,
  updateMemberRole,
  updateTask,
} from "./api";
import type { Task } from "./types";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await listTasks()).records,
    staleTime: 30_000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await listProjects()).records,
    staleTime: 300_000,
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, fields }: { taskId: string; fields: Partial<Task> }) =>
      updateTask(taskId, fields),
    onMutate: async ({ taskId, fields }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        (old || []).map((t) => (t.id === taskId ? { ...t, ...fields } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tasks"], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: Partial<Task>) => createTask(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useActivity(taskId: string) {
  return useQuery({
    queryKey: ["activity", taskId],
    queryFn: async () => (await listActivity(taskId)).activities,
    staleTime: 10_000,
    enabled: !!taskId,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createActivity,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["activity", vars.task_id] });
    },
  });
}

export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useUpdateMemberRole() {
  return useMutation({
    mutationFn: updateMemberRole,
  });
}
