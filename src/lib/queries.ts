"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, listProjects, listTasks, updateTask } from "./api";
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
