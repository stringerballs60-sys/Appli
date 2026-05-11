import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService, TaskFilters } from '@/services/tasks';
import { useAuthStore } from '@/stores/authStore';
import { TaskFormData } from '@/types';

export const TASKS_KEY = 'tasks';
export const TEMPLATES_KEY = 'task_templates';

export function useTasks(filters?: TaskFilters) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [TASKS_KEY, userId, filters],
    queryFn: () => tasksService.getAll(userId!, filters),
    enabled: !!userId,
  });
}

export function useTask(id: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [TASKS_KEY, userId, id],
    queryFn: () => tasksService.getById(id),
    enabled: !!userId && !!id,
    refetchInterval: 5000,
  });
}

export function useTasksCountToday() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [TASKS_KEY, userId, 'count-today'],
    queryFn: () => tasksService.countForToday(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (form: TaskFormData) => tasksService.create(userId!, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.start(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useFinishTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.finish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      taskId,
      label,
      orderIndex,
    }: {
      taskId: string;
      label: string;
      orderIndex: number;
    }) => tasksService.addChecklistItem(taskId, userId!, label, orderIndex),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) =>
      tasksService.toggleChecklistItem(itemId, isChecked),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => tasksService.deleteChecklistItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}

export function usePropertyTemplates(propertyId: string | null) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [TEMPLATES_KEY, userId, propertyId],
    queryFn: () => tasksService.getTemplates(userId!, propertyId!),
    enabled: !!userId && !!propertyId,
  });
}

export function useAddTemplate() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      propertyId,
      label,
      orderIndex,
    }: {
      propertyId: string;
      label: string;
      orderIndex: number;
    }) => tasksService.addTemplate(userId!, propertyId, label, orderIndex),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      taskId,
      propertyId,
    }: {
      taskId: string;
      propertyId: string;
    }) => tasksService.applyTemplate(taskId, userId!, propertyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TASKS_KEY] }),
  });
}
