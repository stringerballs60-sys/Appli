import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '@/services/roles';
import { useAuthStore } from '@/stores/authStore';

export const TEAM_KEY = 'team_members';

export function useTeamMembers() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [TEAM_KEY, userId],
    queryFn: () => rolesService.getTeamMembers(userId!),
    enabled: !!userId,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (params: { email: string; password: string; fullName: string; role: 'cleaner' | 'comptable' }) =>
      rolesService.inviteMember({ ...params, ownerId: userId! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAM_KEY] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (memberId: string) => rolesService.removeMember(memberId, userId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAM_KEY] }),
  });
}
