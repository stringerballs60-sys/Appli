import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/properties';
import { useAuthStore } from '@/stores/authStore';
import { PropertyFormData } from '@/types';

export const PROPERTIES_KEY = 'properties';

export function useProperties() {
  const userId = useAuthStore((s) => s.effectiveUserId ?? s.user?.id);
  return useQuery({
    queryKey: [PROPERTIES_KEY, userId],
    queryFn: () => propertiesService.getAll(userId!),
    enabled: !!userId,
  });
}

export function useActiveProperties() {
  const userId = useAuthStore((s) => s.effectiveUserId ?? s.user?.id);
  return useQuery({
    queryKey: [PROPERTIES_KEY, userId, 'active'],
    queryFn: () => propertiesService.getActive(userId!),
    enabled: !!userId,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: [PROPERTIES_KEY, id],
    queryFn: () => propertiesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (form: PropertyFormData) => propertiesService.create(userId!, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PropertyFormData> }) =>
      propertiesService.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
}

export function useTogglePropertyActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      propertiesService.toggleActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
}

export function useSyncIcal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { supabase } = await import('@/services/supabase');
      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: { property_id: propertyId },
      });
      if (error) throw error;
      return data as { ok: boolean; results: { property_id: string; success: boolean; upserted?: number; cancelled?: number; error?: string }[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useUpdateCleaningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, date }: { id: string; status: 'ready' | 'to_do'; date: string }) =>
      propertiesService.updateCleaningStatus(id, status, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPERTIES_KEY] }),
  });
}
