import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsService } from '@/services/reservations';
import { useAuthStore } from '@/stores/authStore';
import { ReservationFormData, Property } from '@/types';

export const RESERVATIONS_KEY = 'reservations';

export function useReservations(filters?: {
  propertyId?: string;
  from?: string;
  to?: string;
  status?: string;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, filters],
    queryFn: () => reservationsService.getAll(userId!, filters),
    enabled: !!userId,
  });
}

export function useReservationsForMonth(from: string, to: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'month', from, to],
    queryFn: () => reservationsService.getForMonth(userId!, from, to),
    enabled: !!userId && !!from && !!to,
  });
}

export function useReservationsForDay(date: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'day', date],
    queryFn: () => reservationsService.getForDay(userId!, date),
    enabled: !!userId && !!date,
  });
}

export function useUpcomingReservations(limit = 3) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'upcoming', limit],
    queryFn: () => reservationsService.getUpcoming(userId!, limit),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useTodayActivity() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'today'],
    queryFn: () => reservationsService.getTodayActivity(userId!),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePendingCheckInTime(daysAhead = 3) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'pending-checkin-time', daysAhead],
    queryFn: () => reservationsService.getPendingCheckInTime(userId!, daysAhead),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpcomingActivity(limit = 5) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'upcomingActivity', limit],
    queryFn: () => reservationsService.getUpcomingActivity(userId!, limit),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useOccupiedToday() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: [RESERVATIONS_KEY, userId, 'occupied', today],
    queryFn: () => reservationsService.getForDay(userId!, today),
    enabled: !!userId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ form, property }: { form: ReservationFormData; property: Property }) =>
      reservationsService.create(userId!, form, property),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] }),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      form,
      property,
    }: {
      id: string;
      form: Partial<ReservationFormData>;
      property?: Property;
    }) => reservationsService.update(id, form, property),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] }),
  });
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reservationsService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] }),
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reservationsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RESERVATIONS_KEY] }),
  });
}