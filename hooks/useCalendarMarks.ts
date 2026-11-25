import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { calendarMarksService, CalendarMarkInput } from '@/services/calendarMarks';

const KEY = 'calendar_marks';

export function useCalendarMarks() {
  const userId = useAuthStore((s) => s.effectiveUserId ?? s.user?.id);
  return useQuery({
    queryKey: [KEY, userId],
    queryFn: () => calendarMarksService.getAll(userId!),
    enabled: !!userId,
  });
}

export function useSaveCalendarMark() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CalendarMarkInput }) =>
      id ? calendarMarksService.update(id, input) : calendarMarksService.create(userId!, input).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCalendarMark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarMarksService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
