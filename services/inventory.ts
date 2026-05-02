import { supabase } from './supabase';
import { LinenInventory, EquipmentInventory, Consumable, LinenType } from '@/types';

export const inventoryService = {
  // ── Linen ────────────────────────────────────────────────────────────────

  async getLinenForProperty(propertyId: string): Promise<LinenInventory[]> {
    const { data, error } = await supabase
      .from('linen_inventory')
      .select('*')
      .eq('property_id', propertyId)
      .order('linen_type');
    if (error) throw error;
    return data;
  },

  async upsertLinen(
    userId: string,
    propertyId: string,
    linenType: LinenType,
    updates: Partial<Pick<LinenInventory, 'qty_in_property' | 'qty_dirty_washing' | 'qty_clean_stock' | 'target_rotation'>>
  ): Promise<LinenInventory> {
    const { data, error } = await supabase
      .from('linen_inventory')
      .upsert(
        { user_id: userId, property_id: propertyId, linen_type: linenType, ...updates },
        { onConflict: 'property_id,linen_type' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Equipment ────────────────────────────────────────────────────────────

  async getEquipmentForProperty(propertyId: string): Promise<EquipmentInventory[]> {
    const { data, error } = await supabase
      .from('equipment_inventory')
      .select('*')
      .eq('property_id', propertyId)
      .order('item_name');
    if (error) throw error;
    return data;
  },

  async createEquipment(
    userId: string,
    propertyId: string,
    item: Omit<EquipmentInventory, 'id' | 'user_id' | 'property_id' | 'created_at' | 'updated_at'>
  ): Promise<EquipmentInventory> {
    const { data, error } = await supabase
      .from('equipment_inventory')
      .insert({ ...item, user_id: userId, property_id: propertyId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEquipment(
    id: string,
    updates: Partial<Pick<EquipmentInventory, 'item_name' | 'quantity' | 'condition' | 'notes'>>
  ): Promise<EquipmentInventory> {
    const { data, error } = await supabase
      .from('equipment_inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteEquipment(id: string): Promise<void> {
    const { error } = await supabase.from('equipment_inventory').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Consumables ──────────────────────────────────────────────────────────

  async getConsumablesForProperty(propertyId: string): Promise<Consumable[]> {
    const { data, error } = await supabase
      .from('consumables')
      .select('*')
      .eq('property_id', propertyId)
      .order('item_name');
    if (error) throw error;
    return data.map((c) => ({ ...c, is_low: Number(c.current_stock) <= Number(c.min_threshold) }));
  },

  async getLowStockAlerts(userId: string): Promise<Consumable[]> {
    const { data, error } = await supabase
      .from('consumables')
      .select('*, property:properties(id, name, color)')
      .eq('user_id', userId);
    if (error) throw error;
    return data
      .filter((c) => Number(c.current_stock) <= Number(c.min_threshold))
      .map((c) => ({ ...c, is_low: true }));
  },

  async createConsumable(
    userId: string,
    propertyId: string,
    item: { item_name: string; unit: string; current_stock: number; min_threshold: number; notes?: string }
  ): Promise<Consumable> {
    const { data, error } = await supabase
      .from('consumables')
      .insert({ ...item, user_id: userId, property_id: propertyId })
      .select()
      .single();
    if (error) throw error;
    return { ...data, is_low: Number(data.current_stock) <= Number(data.min_threshold) };
  },

  async updateConsumable(
    id: string,
    updates: Partial<Pick<Consumable, 'item_name' | 'unit' | 'current_stock' | 'min_threshold' | 'notes'>>
  ): Promise<Consumable> {
    const { data, error } = await supabase
      .from('consumables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { ...data, is_low: Number(data.current_stock) <= Number(data.min_threshold) };
  },

  async deleteConsumable(id: string): Promise<void> {
    const { error } = await supabase.from('consumables').delete().eq('id', id);
    if (error) throw error;
  },
};
