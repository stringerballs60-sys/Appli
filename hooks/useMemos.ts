import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memosService } from '@/services/memos';
import { useAuthStore } from '@/stores/authStore';
import { MemoPriority } from '@/types';

const MEMOS_KEY = 'memos';

export function usePendingMemos() {
  const userId = useAuthStore((s) => s.effectiveUserId ?? s.user?.id);
  return useQuery({
    queryKey: [MEMOS_KEY, userId, 'pending'],
    queryFn: () => memosService.getPending(userId!),
    enabled: !!userId,
    refetchInterval: 60 * 1000,
  });
}

export function useDoneMemos() {
  const userId = useAuthStore((s) => s.effectiveUserId ?? s.user?.id);
  return useQuery({
    queryKey: [MEMOS_KEY, userId, 'done'],
    queryFn: () => memosService.getDone(userId!),
    enabled: !!userId,
  });
}

export function useAddMemo() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ text, priority }: { text: string; priority?: MemoPriority }) =>
      memosService.add(userId!, text, priority),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEMOS_KEY] }),
  });
}

export function useMarkMemoDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memosService.markDone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEMOS_KEY] }),
  });
}

export function useMarkMemoPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memosService.markPending(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEMOS_KEY] }),
  });
}

export function useDeleteMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => memosService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MEMOS_KEY] }),
  });
}
