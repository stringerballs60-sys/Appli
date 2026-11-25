import { supabase } from './supabase';
import { Reservation, ReservationFormData, Property, BlockReason, ReservationCategory, ReservationStatus } from '@/types';
import { blockReasonLabel } from '@/constants/blocks';
import { calculateLinen } from '@/utils/linenCalculator';

export const reservationsService = {
  async getAll(
    userId: string,
    filters?: { propertyId?: string; from?: string; to?: string; status?: string; category?: string; channel?: string; kind?: 'stay' | 'block' }
  ): Promise<Reservation[]> {
    let query = supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .order('check_in', { ascending: true });

    if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);
    if (filters?.from) query = query.gte('check_in', filters.from);
    if (filters?.to) query = query.lte('check_out', filters.to);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.kind) query = query.eq('kind', filters.kind);
    if (filters?.channel === 'airbnb') query = query.or('source.eq.airbnb,category.like.AIRBNB%');
    else if (filters?.channel === 'manual') query = query.eq('source', 'manual').not('category', 'like', 'AIRBNB%');
    else if (filters?.channel) query = query.eq('source', filters.channel);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getForMonth(userId: string, from: string, to: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(id, name, color)')
      .eq('user_id', userId)
      .lt('check_in', to)
      .gt('check_out', from)
      .neq('status', 'cancelled');
    if (error) throw error;
    return data;
  },

  async getForDay(userId: string, date: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .lte('check_in', date)
      .gt('check_out', date)
      .neq('status', 'cancelled')
      .eq('kind', 'stay');
    if (error) throw error;
    return data;
  },

  async getRecentDepartures(userId: string, daysBack = 90): Promise<{ id: string; property_id: string; check_out: string }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    const { data, error } = await supabase
      .from('reservations')
      .select('id, property_id, check_out')
      .eq('user_id', userId)
      .lte('check_out', today)
      .gte('check_out', from.toISOString().slice(0, 10))
      .neq('status', 'cancelled')
      .eq('kind', 'stay')
      .order('check_out', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getUpcoming(userId: string, limit = 3): Promise<Reservation[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .gte('check_in', today)
      .neq('status', 'cancelled')
      .eq('kind', 'stay')
      .order('check_in')
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getTodayActivity(userId: string): Promise<{
    checkIns: Reservation[];
    checkOuts: Reservation[];
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const [checkInsRes, checkOutsRes] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .eq('check_in', today)
        .neq('status', 'cancelled')
      .eq('kind', 'stay'),
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .eq('check_out', today)
        .neq('status', 'cancelled')
      .eq('kind', 'stay'),
    ]);
    if (checkInsRes.error) throw checkInsRes.error;
    if (checkOutsRes.error) throw checkOutsRes.error;
    return { checkIns: checkInsRes.data, checkOuts: checkOutsRes.data };
  },

  async getPendingCheckInTime(userId: string, daysAhead = 3): Promise<Reservation[]> {
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .gte('check_in', today)
      .lte('check_in', cutoffStr)
      .eq('check_in_time_confirmed', false)
      .neq('status', 'cancelled')
      .eq('kind', 'stay')
      .order('check_in');
    if (error) throw error;
    return data;
  },

  async checkOverlap(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('reservations')
      .select('id')
      .eq('property_id', propertyId)
      .neq('status', 'cancelled')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async create(
    userId: string,
    form: ReservationFormData,
    property: Property
  ): Promise<Reservation> {
    const linen_calculation = calculateLinen(
      { nb_couples: form.nb_couples, nb_solo_adults: form.nb_solo_adults, nb_children: form.nb_children },
      {
        beds_double_used: form.beds_double_used,
        beds_single_used: form.beds_single_used,
        beds_sofa_used: form.beds_sofa_used,
        beds_crib_used: form.beds_crib_used,
      },
      property.nb_bathrooms
    );

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        ...form,
        user_id: userId,
        linen_calculation,
        guest_email: form.guest_email || null,
        guest_phone: form.guest_phone || null,
        notes: form.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    form: Partial<ReservationFormData>,
    property?: Property
  ): Promise<Reservation> {
    let linen_calculation = undefined;
    if (property && form.beds_double_used !== undefined) {
      linen_calculation = calculateLinen(
        {
          nb_couples: form.nb_couples ?? 0,
          nb_solo_adults: form.nb_solo_adults ?? 0,
          nb_children: form.nb_children ?? 0,
        },
        {
          beds_double_used: form.beds_double_used ?? 0,
          beds_single_used: form.beds_single_used ?? 0,
          beds_sofa_used: form.beds_sofa_used ?? 0,
          beds_crib_used: form.beds_crib_used ?? 0,
        },
        property.nb_bathrooms
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ ...form, ...(linen_calculation ? { linen_calculation } : {}) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  async createBlocks(
    userId: string,
    input: { propertyIds: string[]; checkIn: string; checkOut: string; reason: BlockReason; notes?: string }
  ): Promise<Reservation[]> {
    const rows = input.propertyIds.map((property_id) => ({
      user_id: userId,
      property_id,
      kind: 'block',
      block_reason: input.reason,
      category: ReservationCategory.DIRECT_OWN,
      status: ReservationStatus.CONFIRMED,
      source: 'manual',
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: blockReasonLabel(input.reason),
      nb_couples: 0,
      nb_solo_adults: 0,
      nb_children: 0,
      nb_babies: 0,
      beds_double_used: 0,
      beds_single_used: 0,
      beds_sofa_used: 0,
      beds_crib_used: 0,
      linen_calculation: null,
      notes: input.notes?.trim() || null,
    }));
    const { data, error } = await supabase.from('reservations').insert(rows).select();
    if (error) throw error;
    return data ?? [];
  },

  async updateBlock(
    id: string,
    input: { checkIn: string; checkOut: string; reason: BlockReason; notes?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .update({
        check_in: input.checkIn,
        check_out: input.checkOut,
        block_reason: input.reason,
        guest_name: blockReasonLabel(input.reason),
        notes: input.notes?.trim() || null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async findOverlaps(
    propertyIds: string[],
    checkIn: string,
    checkOut: string,
    excludeId?: string
  ): Promise<Pick<Reservation, 'id' | 'property_id' | 'kind' | 'guest_name' | 'check_in' | 'check_out'>[]> {
    let query = supabase
      .from('reservations')
      .select('id, property_id, kind, guest_name, check_in, check_out')
      .in('property_id', propertyIds)
      .neq('status', 'cancelled')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
  },

  async getFutureTurnovers(
    userId: string,
    maxDate: string
  ): Promise<{ dep: Reservation; arr: Reservation }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .gte('check_out', today)
      .neq('status', 'cancelled')
      .eq('kind', 'stay')
      .order('check_out');
    if (error) throw error;

    const reservations = data ?? [];
    const result: { dep: Reservation; arr: Reservation }[] = [];
    const seen = new Set<string>();

    reservations.forEach(dep => {
      if (dep.check_out > maxDate) return;
      const key = `${dep.property_id}::${dep.check_out}`;
      if (seen.has(key)) return;
      const arr = reservations.find(
        r => r.id !== dep.id && r.property_id === dep.property_id && r.check_in === dep.check_out
      );
      if (arr) {
        seen.add(key);
        result.push({ dep, arr });
      }
    });

    return result;
  },

  async getUpcomingActivity(
    userId: string,
    limit = 5
  ): Promise<{ arrivals: Reservation[]; departures: Reservation[] }> {
    const today = new Date().toISOString().slice(0, 10);
    const [arr, dep] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .gt('check_in', today)
        .neq('status', 'cancelled')
      .eq('kind', 'stay')
        .order('check_in')
        .limit(limit),
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .gt('check_out', today)
        .neq('status', 'cancelled')
      .eq('kind', 'stay')
        .order('check_out')
        .limit(limit),
    ]);
    if (arr.error) throw arr.error;
    if (dep.error) throw dep.error;
    return { arrivals: arr.data, departures: dep.data };
  },
};
