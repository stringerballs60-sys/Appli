import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventory';
import { useAuthStore } from '@/stores/authStore';
import { LinenType, EquipmentInventory, Consumable } from '@/types';

export const LINEN_KEY = 'linen';
export const EQUIPMENT_KEY = 'equipment';
export const CONSUMABLES_KEY = 'consumables';

// ── Linen ─────────────────────────────────────────────────────────────────

export function useLinenForProperty(propertyId: string) {
  return useQuery({
    queryKey: [LINEN_KEY, propertyId],
    queryFn: () => inventoryService.getLinenForProperty(propertyId),
    enabled: !!propertyId,
  });
}

export function useUpsertLinen() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      propertyId,
      linenType,
      updates,
    }: {
      propertyId: string;
      linenType: LinenType;
      updates: { qty_in_property?: number; qty_dirty_washing?: number; qty_clean_stock?: number; target_rotation?: number };
    }) => inventoryService.upsertLinen(userId!, propertyId, linenType, updates),
    onSuccess: (_, { propertyId }) =>
      qc.invalidateQueries({ queryKey: [LINEN_KEY, propertyId] }),
  });
}

// ── Equipment ─────────────────────────────────────────────────────────────

export function useEquipmentForProperty(propertyId: string) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, propertyId],
    queryFn: () => inventoryService.getEquipmentForProperty(propertyId),
    enabled: !!propertyId,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      propertyId,
      item,
    }: {
      propertyId: string;
      item: Omit<EquipmentInventory, 'id' | 'user_id' | 'property_id' | 'created_at' | 'updated_at'>;
    }) => inventoryService.createEquipment(userId!, propertyId, item),
    onSuccess: (_, { propertyId }) =>
      qc.invalidateQueries({ queryKey: [EQUIPMENT_KEY, propertyId] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      propertyId,
      updates,
    }: {
      id: string;
      propertyId: string;
      updates: Partial<Pick<EquipmentInventory, 'item_name' | 'quantity' | 'condition' | 'notes'>>;
    }) => inventoryService.updateEquipment(id, updates),
    onSuccess: (_, { propertyId }) =>
      qc.invalidateQueries({ queryKey: [EQUIPMENT_KEY, propertyId] }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, propertyId }: { id: string; propertyId: string }) =>
      inventoryService.deleteEquipment(id),
    onSuccess: (_, { propertyId }) =>
      qc.invalidateQueries({ queryKey: [EQUIPMENT_KEY, propertyId] }),
  });
}

// ── Consumables ───────────────────────────────────────────────────────────

export function useConsumablesForProperty(propertyId: string) {
  return useQuery({
    queryKey: [CONSUMABLES_KEY, propertyId],
    queryFn: () => inventoryService.getConsumablesForProperty(propertyId),
    enabled: !!propertyId,
  });
}

export function useLowStockAlerts() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [CONSUMABLES_KEY, userId, 'low'],
    queryFn: () => inventoryService.getLowStockAlerts(userId!),
    enabled: !!userId,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useCreateConsumable() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      propertyId,
      item,
    }: {
      propertyId: string;
      item: { item_name: string; unit: string; current_stock: number; min_threshold: number; notes?: string };
    }) => inventoryService.createConsumable(userId!, propertyId, item),
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, propertyId] });
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, userId, 'low'] });
    },
  });
}

export function useUpdateConsumable() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({
      id,
      propertyId,
      updates,
    }: {
      id: string;
      propertyId: string;
      updates: Partial<Pick<Consumable, 'item_name' | 'unit' | 'current_stock' | 'min_threshold' | 'notes'>>;
    }) => inventoryService.updateConsumable(id, updates),
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, propertyId] });
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, userId, 'low'] });
    },
  });
}

export function useDeleteConsumable() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ id, propertyId }: { id: string; propertyId: string }) =>
      inventoryService.deleteConsumable(id),
    onSuccess: (_, { propertyId }) => {
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, propertyId] });
      qc.invalidateQueries({ queryKey: [CONSUMABLES_KEY, userId, 'low'] });
    },
  });
}
